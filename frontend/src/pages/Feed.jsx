import { useState, useEffect, useRef } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import SwipeCard from '../components/SwipeCard.jsx'

export default function Feed() {

    const [videoCards, setVideoCards] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const swiped = useRef(false)

    const [{ y }, api] = useSpring(() => ({ y: 0 }))

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

    const bind = useDrag(({ active, movement: [, my] }) => {
        if (swiped.current) return
        if (active) {
            api.start({ y: my, immediate: true })
        } else {
            if (Math.abs(my) > 100) {
                swiped.current = true
                const goUp = my < 0
                api.start({
                    y: goUp ? -window.innerHeight : window.innerHeight,
                    onRest: () => {
                        api.set({ y: 0 })
                        setCurrentIndex(prev => {
                            const len = videoCards.length
                            if (goUp) return (prev + 1) % len
                            return (prev - 1 + len) % len
                        })
                        swiped.current = false
                    }
                })
            } else {
                api.start({ y: 0 })
            }
        }
    }, { axis: 'y' })

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

    if (videoCards.length === 0) return <div className="feed"></div>

    const prevIndex = (currentIndex - 1 + videoCards.length) % videoCards.length
    const nextIndex = (currentIndex + 1) % videoCards.length

    return (
        <div className="feed" {...bind()} style={{ touchAction: 'none' }}>
            <animated.div className="feed-card" style={{ y: y.to(v => v - window.innerHeight) }}>
                <SwipeCard key={videoCards[prevIndex].video} card={videoCards[prevIndex]} active={false} />
            </animated.div>
            <animated.div className="feed-card" style={{ y }}>
                <SwipeCard key={videoCards[currentIndex].video} card={videoCards[currentIndex]} active={true} />
            </animated.div>
            <animated.div className="feed-card" style={{ y: y.to(v => v + window.innerHeight) }}>
                <SwipeCard key={videoCards[nextIndex].video} card={videoCards[nextIndex]} active={false} />
            </animated.div>
        </div>
    )
}
