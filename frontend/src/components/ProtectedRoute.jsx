import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import { COG_USER_POOL_ID, COG_CLIENT_ID } from '../aws-config'
import { logInfo, logWarn } from '../utils/logger.js'

const userPool = new CognitoUserPool({
    UserPoolId: COG_USER_POOL_ID,
    ClientId: COG_CLIENT_ID,
})

export default function ProtectedRoute({ children }) {
    const [authState, setAuthState] = useState(() => (
        userPool.getCurrentUser() ? 'checking' : 'unauthenticated'
    ))

    useEffect(() => {
        const user = userPool.getCurrentUser()
        if (!user) {
            logWarn('protected_route_no_session')
            return
        }
        user.getSession((err) => {
            if (err) {
                logWarn('protected_route_session_invalid', { code: err.code, message: err.message })
            } else {
                logInfo('protected_route_session_valid')
            }
            setAuthState(err ? 'unauthenticated' : 'authenticated')
        })
    }, [])

    if (authState === 'checking') return null
    if (authState === 'unauthenticated') return <Navigate to="/login" replace />
    return children
}
