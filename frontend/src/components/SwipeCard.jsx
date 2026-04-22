import { useState, useRef } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'

import '../../index.css'

export default function SwipeCard({ card, onSwipe, nextVideo }) {
    const [likes, updateLikes] = useState(card.likeCount)
    const [liked, setLiked] = useState(false)
    const [videoReady, setVideoReady] = useState(false)
    const videoRef = useRef(null)
    
    const swiped = useRef(false)
    const [{ y }, api] = useSpring(() => ({ y: 0 }))

    const bind = useDrag(({ active, movement: [, my] }) => {
        if (swiped.current) return
        if (active) {
            api.start({ y: my })
        } else {
            if (Math.abs(my) > 100) {
                swiped.current = true
                const direction = my < 0 ? 'up' : 'down'
                api.start({
                    y: my < 0 ? -1000 : 1000,
                    onRest: () => onSwipe(direction)
                })
            } else {
                api.start({ y: 0 })
            }
        }
    }, { axis: 'y' })

    function handleLike() {
        if (!liked) {
            fetch(`https://00bws6efnk.execute-api.us-east-2.amazonaws.com/prod/like?placeId=${card.placeId}`, {
                method: 'POST'
            })
            updateLikes(likes + 1)
            setLiked(true)
        }
    }

    return (
        <animated.div {...bind()} style={{ y, touchAction: 'none' }} className="swipe-card">
            {!videoReady && <div className="video-loading"><div className="spinner"></div></div>}
            <video ref={videoRef} src={card.video} autoPlay loop muted playsInline onCanPlay={() => setVideoReady(true)} />
            {nextVideo && <link rel="preload" href={nextVideo} as="video" />}
            <div className="card-overlay">
                <h2>{card.name}</h2>
                <button onClick={handleLike}>{liked ? '❤️' : '🤍'} {likes}</button>
                <button>📋 Menu</button>
            </div>
        </animated.div>
    )
}