import { useState, useEffect } from 'react'
import SwipeCard from '../components/SwipeCard.jsx'

export default function Feed() {

    const [videoCards, setVideoCards] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)

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
            for (let i = cards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cards[i], cards[j]] = [cards[j], cards[i]]
            }
            setVideoCards(cards)
            setLoading(false)
        })
    }

    function error(err) {
        console.log(`ERROR: ${err}`)
    }

    function onSwipe(direction) {
        if (direction === 'up') {
            setCurrentIndex(prev => (prev + 1) % videoCards.length)
        } else if (direction === 'down') {
            setCurrentIndex(prev => (prev - 1 + videoCards.length) % videoCards.length)
        }
    }

    const nextVideo = videoCards.length > 0
        ? videoCards[(currentIndex + 1) % videoCards.length].video
        : null

    if (loading) {
        return (
            <div className="feed">
                <div className="loading-screen">
                    <div className="spinner"></div>
                    <p>Finding restaurants nearby...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="feed">
            {videoCards.length > 0 && (
                <SwipeCard
                    key={currentIndex}
                    card={videoCards[currentIndex]}
                    onSwipe={onSwipe}
                    nextVideo={nextVideo}
                />
            )}
        </div>
    )
}