import { useCallback, useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import SwipeCard from '../components/SwipeCard.jsx'
import { logError, logInfo, logWarn } from '../utils/logger.js'
import { authHeaders } from '../utils/apiAuth.js'

const RADIUS_OPTIONS_MILES = [1, 3, 5, 10, 100]
const METERS_PER_MILE = 1609.344
const AnimatedFeedCard = animated.div

export default function Feed() {

    const [videoCards, setVideoCards] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [position, setPosition] = useState(null)
    const [radiusMiles, setRadiusMiles] = useState(5)
    const [likedPlaces, setLikedPlaces] = useState({})
    const [likeDeltas, setLikeDeltas] = useState({})
    const [cardHeight, setCardHeight] = useState(window.innerHeight)
    const swiped = useRef(false)
    const feedRef = useRef(null)

    const [{ y }, api] = useSpring(() => ({ y: 0 }))

    useEffect(() => {
        const onResize = () => { setCardHeight(window.innerHeight) }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    const swipe = useCallback((direction) => {
        if (swiped.current || videoCards.length === 0) return
        const currentCard = videoCards[currentIndex]
        logInfo('feed_swipe_started', { direction, placeId: currentCard?.placeId })
        swiped.current = true
        const goUp = direction === 'up'
        api.start({
            y: goUp ? -cardHeight : cardHeight,
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
    }, [api, cardHeight, currentIndex, videoCards])

    useEffect(() => {
        const el = feedRef.current
        if (!el) return

        const onWheel = (e) => {
            e.preventDefault()
            if (Math.abs(e.deltaY) > 30) {
                swipe(e.deltaY > 0 ? 'up' : 'down')
            }
        }
        const onKey = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault()
                swipe(e.key === 'ArrowDown' ? 'up' : 'down')
            }
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        window.addEventListener('keydown', onKey)
        return () => {
            el.removeEventListener('wheel', onWheel)
            window.removeEventListener('keydown', onKey)
        }
    }, [swipe])

    useEffect(() => {
        logInfo('geolocation_request_started')
        navigator.geolocation.getCurrentPosition(
            pos => {
                logInfo('geolocation_request_succeeded', { accuracyMeters: Math.round(pos.coords.accuracy || 0) })
                setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            },
            error => {
                logWarn('geolocation_request_failed', { code: error.code, message: error.message })
                setLoading(false)
            }
        )
    }, [])

    useEffect(() => {
        if (!position) return
        const radiusMeters = Math.round(radiusMiles * METERS_PER_MILE)
        logInfo('feed_request_started', { radiusMeters })
        authHeaders()
        .then(headers => fetch(`${import.meta.env.VITE_API_BASE_URL}/feed?lat=${position.lat}&lng=${position.lng}&radius=${radiusMeters}`, { headers }))
        .then(response => {
            if (!response.ok) throw new Error(`Feed request failed with status ${response.status}`)
            return response.json()
        })
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
            logInfo('feed_request_succeeded', {
                restaurantCount: data.restaurants.length,
                cardCount: cards.length,
                radiusMeters
            })
        })
        .catch(error => {
            logError('feed_request_failed', { radiusMeters, message: error.message })
            setLoading(false)
        })
    }, [position, radiusMiles])

    function handleToggleLike(placeId, nextLiked) {
        const action = nextLiked ? 'like' : 'unlike'
        logInfo('like_request_started', { placeId, action })
        setLikedPlaces(prev => ({ ...prev, [placeId]: nextLiked }))
        setLikeDeltas(prev => ({
            ...prev,
            [placeId]: (prev[placeId] || 0) + (nextLiked ? 1 : -1)
        }))
        authHeaders()
        .then(headers => fetch(`${import.meta.env.VITE_API_BASE_URL}/like?placeId=${placeId}&action=${action}`, {
            method: 'POST',
            headers
        }))
        .then(response => {
            if (!response.ok) throw new Error(`Like request failed with status ${response.status}`)
            logInfo('like_request_succeeded', { placeId, action })
        })
        .catch(error => {
            logError('like_request_failed', { placeId, action, message: error.message })
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
                swipe(my < 0 ? 'up' : 'down')
            } else {
                api.start({ y: 0 })
            }
        }
    }, { axis: 'y' })

    const rangeFilter = (
        <select
            className="range-filter"
            value={radiusMiles}
            onChange={e => {
                setLoading(true)
                setRadiusMiles(Number(e.target.value))
            }}
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
                <div className="loading-screen">
                    <p>No restaurants found. Please enable location access and refresh.</p>
                </div>
            </div>
        )
    }

    const prevIndex = (currentIndex - 1 + videoCards.length) % videoCards.length
    const nextIndex = (currentIndex + 1) % videoCards.length

    return (
        <div className="feed" ref={feedRef} {...bind()} style={{ touchAction: 'none' }} tabIndex={-1}>
            <AnimatedFeedCard className="feed-card" style={{ y: y.to(v => v - cardHeight) }}>
                <SwipeCard
                    key={`prev-${prevIndex}`}
                    card={videoCards[prevIndex]}
                    active={false}
                    liked={!!likedPlaces[videoCards[prevIndex].placeId]}
                    likeCount={displayedLikeCount(videoCards[prevIndex])}
                    onToggleLike={handleToggleLike}
                />
            </AnimatedFeedCard>
            <AnimatedFeedCard className="feed-card" style={{ y }}>
                <SwipeCard
                    key={`current-${currentIndex}`}
                    card={videoCards[currentIndex]}
                    active={true}
                    liked={!!likedPlaces[videoCards[currentIndex].placeId]}
                    likeCount={displayedLikeCount(videoCards[currentIndex])}
                    onToggleLike={handleToggleLike}
                />
            </AnimatedFeedCard>
            <AnimatedFeedCard className="feed-card" style={{ y: y.to(v => v + cardHeight) }}>
                <SwipeCard
                    key={`next-${nextIndex}`}
                    card={videoCards[nextIndex]}
                    active={false}
                    liked={!!likedPlaces[videoCards[nextIndex].placeId]}
                    likeCount={displayedLikeCount(videoCards[nextIndex])}
                    onToggleLike={handleToggleLike}
                />
            </AnimatedFeedCard>
            {rangeFilter}
        </div>
    )
}
