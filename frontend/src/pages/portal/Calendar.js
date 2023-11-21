import React, { useState, useEffect } from 'react'
import { Calendar, dayjsLocalizer } from 'react-big-calendar'
import dayjs from 'dayjs'
import axios from 'axios'
import { createAvailability } from '../../components/availability'
import { jwtDecode } from 'jwt-decode'

const localizer = dayjsLocalizer(dayjs)

const MyCalendar = (props) => {
  const [myEventsList, setMyEventsList] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [user, setUser] = useState(null)
  const [setAvailabilityMap] = useState({})

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Gets the token from local storage
        const token = localStorage.getItem('user-token')

        if (token) {
          const axiosInstance = axios.create({
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        
          const decodedToken = jwtDecode(token);
          const userId = decodedToken.userId;

          // Send a request to the server to get user data
          const userDataResponse = await axiosInstance.get(`/api/users/${userId}`);
          
          // Sends a request to get user availabilities
          const availabilitiesResponse = await axiosInstance.get(`/api/user/${userId}/availability`);

          const userData = userDataResponse.data;
          const availabilitiesData = availabilitiesResponse.data
          
          // Updates the state to store the user data
          setUser(userData)

           // Map availabilities to the format expected by the calendar
          const mappedAvailabilities = availabilitiesData.map((availability) => ({
            title: 'Available',
            start: new Date(availability.start_time),
            end: new Date(availability.end_time),
            availability_id: availability.availability_id,
          }));

          const newAvailabilityMap = {}
          mappedAvailabilities.forEach((availability, index) => {
            newAvailabilityMap[availability.availability_id] = index
          })
          setAvailabilityMap(newAvailabilityMap)

          // Updates the state to store the mapped availabilities
          setMyEventsList(mappedAvailabilities);
          }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Handle error
      }
    }

    // Call the function to fetch user data when the component mounts
    fetchUserData()
  }, [])

  // Function to handle adding availability
  const handleSelectSlot = (slotInfo) => {
    const { start, end, action } = slotInfo;

    // Checks the current view to determine how to handle the selection
    if (action === 'select') {
      if (props.view === 'month') {
        // In month view, selects the whole day
        setSelectedSlot({ start: dayjs(start).startOf('day'), end: dayjs(end).endOf('day') });
      } else {
        // In day/week view, selects the specific time
        setSelectedSlot({ start, end });
      }
    } else if (action === 'click') {
      // Handles click events if needed
    }
  };

  const handleConfirmSelection = (token) => {
    if (selectedSlot) {
      const formatToMySQLTimestamp = (dateTime) => dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss');
      console.log("Start: ",selectedSlot.start)
      console.log("End: ",selectedSlot.end)
      const newEvent = {
        title: 'Available',
        start: formatToMySQLTimestamp(selectedSlot.start),
        end: formatToMySQLTimestamp(selectedSlot.end),
      };
      const user_id = user?.user_id;

      // Calls the createAvailability function from availability.js
      createAvailability(
        user_id,
        newEvent.start,
        newEvent.end
      )
        .then((data) => {
          // Handles success
          console.log('Availability created successfully:', data);

          // Fetches the updated user availabilities after creation
          return axios.get(`/api/user/${user_id}/availability`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        })
        .then((availabilitiesResponse) => {
          const availabilitiesData = availabilitiesResponse.data;

          // Map availabilities to the format expected by the calendar
          const mappedAvailabilities = availabilitiesData.map((availability) => ({
            title: 'Available',
            start: new Date(availability.start_time),
            end: new Date(availability.end_time),
            availability_id: availability.availability_id,
          }));

          // Update the state to store the mapped availabilities and availability map
          const newAvailabilityMap = {};
          mappedAvailabilities.forEach((availability, index) => {
            newAvailabilityMap[availability.availability_id] = index;
          });

          setMyEventsList(mappedAvailabilities);
          setAvailabilityMap(newAvailabilityMap);
          setSelectedSlot(null); // Clears the selected slot
        })
        .catch((error) => {
          // Handles error
          console.error('Error creating availability:', error);
        });
    }
  };

  const handleCancelSelection = () => {
    setSelectedSlot(null); // Clears the selected slot
  };

  const handleRemoveAvailability = (event) => {
    const updatedEventsList = myEventsList.filter((e) => e !== event);
    setMyEventsList(updatedEventsList);
  };

  

  //Get from timeslots from botton
  let showTimeslots = () => {

    axios.get("/api/timeslots/")
      .then(response => {
        console.log('Response: ', response);
      })
      .catch(error => {
        console.error('Error', error);
      });
    //console.log(getSlots);
  };


  return (
    <div>
      <Calendar
        localizer={localizer}
        events={myEventsList}
        startAccessor="start"
        endAccessor="end"
        selectable
        onSelectSlot={handleSelectSlot}
        style={{ height: 500 }}
        step={5}
      />
      {selectedSlot && (
        <div>
          <p>Selected Slot:</p>
          <p>Start: {selectedSlot.start.toLocaleString()}</p>
          <p>End: {selectedSlot.end.toLocaleString()}</p>
          <button onClick={handleConfirmSelection}>Confirm</button>
          <button onClick={handleCancelSelection}>Cancel</button>
        </div>
      )}

      <div>
        <p></p>
        <button id="showUsers" onClick={showUsers}>Show All Users</button>
        <button id="showTimeslots" onClick={showTimeslots}>Connect to Timeslots</button>

        <legend>Directions</legend>
        <p>Drag your cursor to select your available time.</p>
        <p>Select Week or Day to pick a specific time.</p>
      </div>

      <div>
        <p>Selected Availabilities:</p>
        {myEventsList.map((event, index) => (
          <div key={index}>
            {event.title} - {event.start.toLocaleString()} to {event.end.toLocaleString()}
            <button onClick={() => handleRemoveAvailability(event)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MyCalendar