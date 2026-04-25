import { useState, useRef, useEffect } from 'react'
import '../../index.css'

export default function SwipeCard({ card, active, liked, likeCount, onToggleLike }) {
    const [menu, setMenu] = useState(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const videoRef = useRef(null)

    useEffect(() => {
        if (active && !menuOpen) {
            videoRef.current?.play().catch(() => {})
        } else {
            videoRef.current?.pause()
        }
    }, [active, menuOpen])

    function handleMenu() {
        if (menu) {
            setMenuOpen(true)
            return
        }
        fetch(`https://00bws6efnk.execute-api.us-east-2.amazonaws.com/prod/menu?placeId=${card.placeId}`)
            .then(res => res.json())
            .then(data => {
                if (data.menuURL) return fetch(data.menuURL)
            })
            .then(res => res.json())
            .then(data => {
                setMenu(data)
                setMenuOpen(true)
            })
            .catch(() => {})
    }

    function handleLike() {
        onToggleLike(card.placeId, !liked)
    }

    return (
        <div className="swipe-card">
            <video
                ref={videoRef}
                src={card.video}
                loop
                muted
                playsInline
                preload="auto"
            />
            <div className="card-overlay" onPointerDown={e => e.stopPropagation()}>
                <h2>{card.name}</h2>
                <button onClick={handleLike}>{liked ? '❤️' : '🤍'} {likeCount}</button>
                <button onClick={handleMenu}>📋 Menu</button>
            </div>
            {menuOpen && menu && (
                <div className="menu-popup" onClick={() => setMenuOpen(false)}>
                    <div className="menu-popup-content" onClick={e => e.stopPropagation()}>
                        <div className="menu-popup-header">
                            <h2>{menu.restaurant}</h2>
                            <button onClick={() => setMenuOpen(false)}>✕</button>
                        </div>
                        <div className="menu-popup-body">
                            {menu.sections.map(section => (
                                <div key={section.name} className="menu-section">
                                    <h3>{section.name}</h3>
                                    {section.items.map(item => (
                                        <div key={item.name} className="menu-item">
                                            <div className="menu-item-top">
                                                <span>{item.name}</span>
                                                {item.price != null && <span>${item.price.toFixed(2)}</span>}
                                            </div>
                                            {item.description && <p>{item.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
