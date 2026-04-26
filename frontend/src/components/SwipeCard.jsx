import { useState, useRef, useEffect } from 'react'
import '../../index.css'
import { logError, logInfo, logWarn } from '../utils/logger.js'
import { authHeaders } from '../utils/apiAuth.js'

export default function SwipeCard({ card, active, liked, likeCount, onToggleLike }) {
    const [menu, setMenu] = useState(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const [menuLoading, setMenuLoading] = useState(false)
    const [menuError, setMenuError] = useState('')
    const videoRef = useRef(null)

    useEffect(() => {
        if (active && !menuOpen) {
            videoRef.current?.play().catch(error => {
                logWarn('video_autoplay_failed', { placeId: card.placeId, message: error.message })
            })
        } else {
            videoRef.current?.pause()
        }
    }, [active, card.placeId, menuOpen])

    async function handleMenu(e) {
        e.stopPropagation()
        setMenuError('')
        setMenuOpen(true)
        logInfo('menu_opened', { placeId: card.placeId })

        if (menu) return

        setMenuLoading(true)
        logInfo('menu_request_started', { placeId: card.placeId })
        try {
            const headers = await authHeaders()
            const menuResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/menu?placeId=${card.placeId}`, { headers })
            if (!menuResponse.ok) throw new Error('Menu not found')

            const menuData = await menuResponse.json()
            if (!menuData.menuURL) throw new Error('Menu URL missing')

            const fileResponse = await fetch(menuData.menuURL)
            if (!fileResponse.ok) throw new Error('Menu file unavailable')

            const fileData = await fileResponse.json()
            setMenu(fileData)
            logInfo('menu_request_succeeded', {
                placeId: card.placeId,
                sectionCount: fileData.sections?.length || 0
            })
        } catch (error) {
            setMenuError(error.message || 'Menu unavailable')
            logError('menu_request_failed', { placeId: card.placeId, message: error.message })
        } finally {
            setMenuLoading(false)
        }
    }

    function handleLike(e) {
        e.stopPropagation()
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
            <div className="card-overlay" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                <h2>{card.name}</h2>
                <button onClick={handleLike}>{liked ? 'Liked' : 'Like'} {likeCount}</button>
                <button onClick={handleMenu}>Menu</button>
            </div>
            {menuOpen && (
                <div className="menu-popup" onClick={() => setMenuOpen(false)}>
                    <div className="menu-popup-content" onClick={e => e.stopPropagation()}>
                        <div className="menu-popup-header">
                            <h2>{menu?.restaurant || card.name}</h2>
                            <button onClick={() => setMenuOpen(false)}>Close</button>
                        </div>
                        <div className="menu-popup-body">
                            {menuLoading && <p className="menu-message">Loading menu...</p>}
                            {menuError && <p className="menu-message">{menuError}</p>}
                            {menu?.sections?.map(section => (
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
