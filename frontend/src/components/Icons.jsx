export function HeartIcon({ size = 32, color = '#fff', filled = false }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32"
            fill={filled ? '#FF4D6D' : 'none'}
            stroke={filled ? '#FF4D6D' : color}
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 27s-10-5.6-10-13.2A6.2 6.2 0 0 1 16 9a6.2 6.2 0 0 1 10 4.8C26 21.4 16 27 16 27z"/>
        </svg>
    )
}

export function MenuIcon({ size = 32, color = '#fff' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
            stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 5h12a2 2 0 0 1 2 2v18l-3-2-3 2-3-2-3 2-4-2V7a2 2 0 0 1 2-2z"/>
            <path d="M13 11h8M13 15h8M13 19h5"/>
        </svg>
    )
}

export function CloseIcon({ size = 22, color = '#1F2330' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 22 22" fill="none"
            stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 5l12 12M17 5L5 17"/>
        </svg>
    )
}

export function StarIcon({ size = 16, color = '#FFD86B' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill={color} stroke="none">
            <path d="M8 1.5l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.2 4.1 13.3l.9-4.3-3.3-3 4.4-.5z"/>
        </svg>
    )
}
