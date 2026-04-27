import { useCallback, useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import SwipeCard from '../components/SwipeCard.jsx'
import PhoneFrame from '../components/PhoneFrame.jsx'
import { COG_USER_POOL_ID, COG_CLIENT_ID } from '../aws-config'
import { logError, logInfo, logWarn } from '../utils/logger.js'
import { authHeaders } from '../utils/apiAuth.js'
import { apiFetch } from '../utils/apiFetch.js'

const RADIUS_OPTIONS_MILES = [1, 3, 5, 10, 100]
const METERS_PER_MILE = 1609.344
const AnimatedFeedCard = animated.div
const userPool = new CognitoUserPool({
    UserPoolId: COG_USER_POOL_ID,
    ClientId: COG_CLIENT_ID,
})

const FALLBACK_CARD = {
    placeId: '__fallback__',
    name: 'No restaurants found',
    video: '',
    likeCount: 0,
    videos: [],
    _isFallback: true,
}

function BrandSide() {
    return (
        <aside className="brand-side">
            <div className="brand-meta">
                <span className="brand-meta-pip">B</span>
                BiteRoll · iOS prototype
            </div>
            <h1 className="brand-wordmark">
                Bite<span className="brand-roll">Roll</span>
                <span className="brand-dot" />
            </h1>
            <p className="brand-tagline">
                Matching your hunger to your next favorite restaurant, one swipe at a time.
            </p>
            <div className="brand-features">
                <div className="brand-feature">
                    <span className="brand-feature-num">01</span>
                    <span><b>Swipe up</b> to roll through dishes from spots near you.</span>
                </div>
                <div className="brand-feature">
                    <span className="brand-feature-num">02</span>
                    <span><b>Double-tap</b> or hit the heart to save a craving.</span>
                </div>
                <div className="brand-feature">
                    <span className="brand-feature-num">03</span>
                    <span><b>Tap the menu</b> button to see the full restaurant lineup.</span>
                </div>
            </div>
        </aside>
    )
}

function FeedApp({ videoCards, currentIndex, setCurrentIndex, loading, likedPlaces,
    likeDeltas, handleToggleLike, radiusMiles, setRadiusMiles, setLoading, onSignOut }) {

    const cardHeight = 874
    const swiped = useRef(false)
    const feedRef = useRef(null)
    const [{ y }, api] = useSpring(() => ({ y: 0 }))

    function displayedLikeCount(card) {
        return (card.likeCount || 0) + (likeDeltas[card.placeId] || 0)
    }

    const swipe = useCallback((direction) => {
        if (swiped.current || videoCards.length <= 1) return
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
    }, [api, cardHeight, currentIndex, videoCards, setCurrentIndex])

    useEffect(() => {
        const el = feedRef.current
        if (!el) return
        const onWheel = (e) => {
            e.preventDefault()
            if (Math.abs(e.deltaY) > 30) swipe(e.deltaY > 0 ? 'up' : 'down')
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

    const feedTopbar = (
        <div className="feed-topbar">
            <div className="feed-brand" aria-label="BiteRoll">
                <img src="/logo2.png" alt="" />
            </div>
            <button type="button" className="feed-signout" onClick={onSignOut}>
                Sign out
            </button>
        </div>
    )

    if (loading) {
        return (
            <div className="feed-inner">
                {feedTopbar}
                {rangeFilter}
                <div className="loading-screen">
                    <div className="loading-brand">BiteRoll</div>
                    <div className="spinner" />
                    <p className="loading-text">Finding restaurants nearby...</p>
                </div>
            </div>
        )
    }

    const cards = videoCards.length > 0 ? videoCards : [FALLBACK_CARD]
    const prevIndex = (currentIndex - 1 + cards.length) % cards.length
    const nextIndex = (currentIndex + 1) % cards.length

    return (
        <div className="feed-inner" ref={feedRef} {...bind()} style={{ touchAction: 'none' }} tabIndex={-1}>
            {feedTopbar}
            <AnimatedFeedCard className="feed-card" style={{ y: y.to(v => v - cardHeight) }}>
                <SwipeCard
                    key={`prev-${prevIndex}`}
                    card={cards[prevIndex]}
                    active={false}
                    liked={!!likedPlaces[cards[prevIndex].placeId]}
                    likeCount={displayedLikeCount(cards[prevIndex])}
                    onToggleLike={handleToggleLike}
                />
            </AnimatedFeedCard>
            <AnimatedFeedCard className="feed-card" style={{ y }}>
                <SwipeCard
                    key={`current-${currentIndex}`}
                    card={cards[currentIndex]}
                    active={true}
                    liked={!!likedPlaces[cards[currentIndex].placeId]}
                    likeCount={displayedLikeCount(cards[currentIndex])}
                    onToggleLike={handleToggleLike}
                />
            </AnimatedFeedCard>
            <AnimatedFeedCard className="feed-card" style={{ y: y.to(v => v + cardHeight) }}>
                <SwipeCard
                    key={`next-${nextIndex}`}
                    card={cards[nextIndex]}
                    active={false}
                    liked={!!likedPlaces[cards[nextIndex].placeId]}
                    likeCount={displayedLikeCount(cards[nextIndex])}
                    onToggleLike={handleToggleLike}
                />
            </AnimatedFeedCard>
            {rangeFilter}
        </div>
    )
}

export default function Feed() {
    const navigate = useNavigate()
    const [videoCards, setVideoCards] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [position, setPosition] = useState(null)
    const [radiusMiles, setRadiusMiles] = useState(5)
    const [likedPlaces, setLikedPlaces] = useState({})
    const [likeDeltas, setLikeDeltas] = useState({})

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
        .then(headers => apiFetch(`/feed?lat=${position.lat}&lng=${position.lng}&radius=${radiusMeters}`, { headers }))
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
        if (placeId === '__fallback__') return
        const action = nextLiked ? 'like' : 'unlike'
        logInfo('like_request_started', { placeId, action })
        setLikedPlaces(prev => ({ ...prev, [placeId]: nextLiked }))
        setLikeDeltas(prev => ({
            ...prev,
            [placeId]: (prev[placeId] || 0) + (nextLiked ? 1 : -1)
        }))
        authHeaders()
        .then(headers => apiFetch(`/like?placeId=${placeId}&action=${action}`, {
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

    function handleSignOut() {
        logInfo('logout_started')
        const user = userPool.getCurrentUser()
        if (user) {
            user.signOut()
        }
        logInfo('logout_succeeded')
        navigate('/login', { replace: true })
    }

    return (
        <div className="feed-page">
            <div className="stage">
                <BrandSide />
                <div className="phone-side">
                    <PhoneFrame>
                        <FeedApp
                            videoCards={videoCards}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            loading={loading}
                            likedPlaces={likedPlaces}
                            likeDeltas={likeDeltas}
                            handleToggleLike={handleToggleLike}
                            radiusMiles={radiusMiles}
                            setRadiusMiles={setRadiusMiles}
                            setLoading={setLoading}
                            onSignOut={handleSignOut}
                        />
                    </PhoneFrame>
                </div>
            </div>
        </div>
    )
}
