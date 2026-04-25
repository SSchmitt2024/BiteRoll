import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import SwipeCard from '../components/SwipeCard.jsx'

const RADIUS_OPTIONS_MILES = [1, 3, 5, 10, 100]
const METERS_PER_MILE = 1609.344

export default function Feed() {

    const [videoCards, setVideoCards] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [likedPlaces, setLikedPlaces] = useState({})
    const [likeDeltas, setLikeDeltas] = useState({})
    const swiped = useRef(false)

    const CARD_HEIGHT = 844
    const [{ y }, api] = useSpring(() => ({ y: 0 }))

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            pos => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            err => console.log(`ERROR: ${err}`)
        )
    }, [])

    useEffect(() => {
        if (!position) return
        setLoading(true)
        const radiusMeters = Math.round(radiusMiles * METERS_PER_MILE)
        fetch(`https://00bws6efnk.execute-api.us-east-2.amazonaws.com/prod/feed?lat=${position.lat}&lng=${position.lng}&radius=${radiusMeters}`)
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
            setCurrentIndex(0)
            setLoading(false)
        })
    }, [position, radiusMiles])

    function handleToggleLike(placeId, nextLiked) {
        setLikedPlaces(prev => ({ ...prev, [placeId]: nextLiked }))
        setLikeDeltas(prev => ({
            ...prev,
            [placeId]: (prev[placeId] || 0) + (nextLiked ? 1 : -1)
        }))
        const action = nextLiked ? 'like' : 'unlike'
        fetch(`https://00bws6efnk.execute-api.us-east-2.amazonaws.com/prod/like?placeId=${placeId}&action=${action}`, {
            method: 'POST'
        })
    }

    function displayedLikeCount(card) {
        return (card.likeCount || 0) + (likeDeltas[card.placeId] || 0)
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
                    y: goUp ? -CARD_HEIGHT : CARD_HEIGHT,
                    onRest: () => {
                        flushSync(() => {
                            setCurrentIndex(prev => {
                                const len = videoCards.length
                                if (goUp) return (prev + 1) % len
                                return (prev - 1 + len) % len
                            })
                        })
                        api.set({ y: 0 })
                        swiped.current = false
                    }
                })
            } else {
                api.start({ y: 0 })
            }
        }
    }, { axis: 'y' })

    const rangeFilter = (
        <select
            className="range-filter"
            value={radiusMiles}
            onChange={e => setRadiusMiles(Number(e.target.value))}
        >
            {RADIUS_OPTIONS_MILES.map(mi => (
                <option key={mi} value={mi}>{mi} mi</option>
            ))}
        </select>
    )

    if (loading) {
        return (
            <div className="feed">
                {rangeFilter}
                <div className="loading-screen">
                    <div className="spinner"></div>
                    <p>Finding restaurants nearby...</p>
                </div>
            </div>
        )
    }

    if (videoCards.length === 0) {
        return (
            <div className="feed">
                {rangeFilter}
            </div>
        )
    }

    const prevIndex = (currentIndex - 1 + videoCards.length) % videoCards.length
    const nextIndex = (currentIndex + 1) % videoCards.length

    return (
        <div className="feed" {...bind()} style={{ touchAction: 'none' }}>
            <animated.div className="feed-card" style={{ y: y.to(v => v - CARD_HEIGHT) }}>
                <SwipeCard
                    key={videoCards[prevIndex].video}
                    card={videoCards[prevIndex]}
                    active={false}
                    liked={!!likedPlaces[videoCards[prevIndex].placeId]}
                    likeCount={displayedLikeCount(videoCards[prevIndex])}
                    onToggleLike={handleToggleLike}
                />
            </animated.div>
            <animated.div className="feed-card" style={{ y }}>
                <SwipeCard
                    key={videoCards[currentIndex].video}
                    card={videoCards[currentIndex]}
                    active={true}
                    liked={!!likedPlaces[videoCards[currentIndex].placeId]}
                    likeCount={displayedLikeCount(videoCards[currentIndex])}
                    onToggleLike={handleToggleLike}
                />
            </animated.div>
            <animated.div className="feed-card" style={{ y: y.to(v => v + CARD_HEIGHT) }}>
                <SwipeCard
                    key={videoCards[nextIndex].video}
                    card={videoCards[nextIndex]}
                    active={false}
                    liked={!!likedPlaces[videoCards[nextIndex].placeId]}
                    likeCount={displayedLikeCount(videoCards[nextIndex])}
                    onToggleLike={handleToggleLike}
                />
            </animated.div>
            {rangeFilter}
        </div>
    )
}
