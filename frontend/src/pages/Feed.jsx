import { useState, useEffect } from 'react'
import SwipeCard from '../components/SwipeCard.jsx'

export default function Feed() {

    const [restaurants, setRestaurants] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(success, error)
    }, [])


    function success(position) {
        const lat = position.coords.latitude 
        const lng = position.coords.longitude 
        
        fetch(`https://00bws6efnk.execute-api.us-east-2.amazonaws.com/prod/feed?lat=${lat}&lng=${lng}`)
        .then(response => response.json())
        .then(data => {
            setRestaurants(data.restaurants)
        })
    }

    function error(err) {
        console.log(`ERROR: ${err}`)
    }

    function onSwipe() {
    setCurrentIndex(currentIndex + 1)
    }

    console.log(restaurants)
    return (
        <p>UPDATED</p>
        /*
        <div className="feed">
            {restaurants.length > 0 && currentIndex < restaurants.length ? (
                <SwipeCard 
                    restaurant={restaurants[currentIndex]} 
                    onSwipe={onSwipe} 
                />
            ) : (
                <div>No more restaurants</div>
            )}
        </div>
        */
    )
}