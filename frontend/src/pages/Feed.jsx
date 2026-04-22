import { useState, useEffect } from 'react'
import SwipeCard from '../components/SwipeCard.jsx'

export default function Feed() {

    const [videoCards, setVideoCards] = useState([])
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
            const cards = data.restaurants.flatMap(restaurant =>
                restaurant.videos.map(video => ({
                    ...restaurant,
                    video
                }))
            )
            setVideoCards(cards)
        })
    }

    function error(err) {
        console.log(`ERROR: ${err}`)
    }

    function onSwipe() {
    setCurrentIndex(currentIndex + 1)
    }

    return (
        <div className="feed">
            {videoCards.length > 0 && currentIndex < videoCards.length ? (
                <SwipeCard
                    card={videoCards[currentIndex]}
                    onSwipe={onSwipe}
                />
            ) : (
                <div>No more restaurants</div>
            )}
        </div>
    )
}