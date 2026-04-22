import { useState, useRef } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'

import '../../index.css'

export default function SwipeCard({ card, onSwipe }) {
    const [likes, updateLikes] = useState(card.likeCount)
    const [liked, setLiked] = useState(false)
    const videoRef = useRef(null)
    
    const [{ y }, api] = useSpring(() => ({ y: 0 }))

    const bind = useDrag(({ active, movement: [, my], direction: [, dy] }) => {
        if (active) {
            api.start({ y: my })
        } else {
            if (Math.abs(my) > 100) {
                api.start({ y: dy > 0 ? 1000 : -1000 })
                onSwipe(dy < 0 ? 'up' : 'down')
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
            <video ref={videoRef} src={card.video} autoPlay loop muted playsInline />
            <div className="card-overlay">
                <h2>{card.name}</h2>
                <button onClick={handleLike}>{liked ? '❤️' : '🤍'} {likes}</button>
                <button>📋 Menu</button>
            </div>
        </animated.div>
    )
}