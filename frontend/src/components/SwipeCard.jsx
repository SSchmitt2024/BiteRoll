import { useState, useRef } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'

import '../../index.css'

export default function SwipeCard({ card, onSwipe }) {
    const [likes, updateLikes] = useState(card.likeCount)
    const [liked, setLiked] = useState(false)
    const videoRef = useRef(null)
    
    const [{ x, rotate }, api] = useSpring(() => ({ x: 0, rotate: 0 }))

    const bind = useDrag(({ active, movement: [mx], direction: [dx] }) => {
        if (active) {
            api.start({ x: mx, rotate: mx / 10 })
        } else {
            if (Math.abs(mx) > 100) {
                api.start({ x: dx > 0 ? 1000 : -1000, rotate: mx / 10 })
                onSwipe()
            } else {
                api.start({ x: 0, rotate: 0 })
            }
        }
    })

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
        <animated.div {...bind()} style={{ x, rotate, touchAction: 'none' }} className="swipe-card">
            <video ref={videoRef} src={card.video} autoPlay loop muted playsInline />
            <div className="card-overlay">
                <h2>{card.name}</h2>
                <button onClick={handleLike}>{liked ? '❤️' : '🤍'} {likes}</button>
                <button>📋 Menu</button>
            </div>
        </animated.div>
    )
}