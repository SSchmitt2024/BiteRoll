//
// Login page
//

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'

import PhoneFrame from '../components/PhoneFrame.jsx'
import { COG_USER_POOL_ID, COG_CLIENT_ID } from '../aws-config'
import { CognitoUserPool, CognitoUser , AuthenticationDetails } from 'amazon-cognito-identity-js'
import { logError, logInfo } from '../utils/logger.js'

const poolData = {
    UserPoolId: COG_USER_POOL_ID,
    ClientId: COG_CLIENT_ID
}

const userPool = new CognitoUserPool(poolData);

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        logInfo('login_started', { hasEmail: Boolean(email) })
        const userDetails = {
            Username: email,
            Password: password,
        };
        const userPoolDetails = {
            Username: email,
            Pool: userPool,
        }
        const callbacks = {
            onSuccess: () => {
                logInfo('login_succeeded')
                navigate('/feed')
            },
            onFailure: (err) => {
                logError('login_failed', { code: err.code, message: err.message })
            },
            newPasswordRequired: () => {
                logInfo('login_new_password_required')
            },

        };
        const authDetails = new AuthenticationDetails(userDetails);
        const cogUser = new CognitoUser(userPoolDetails);
        
        cogUser.setAuthenticationFlowType('USER_PASSWORD_AUTH')
        cogUser.authenticateUser(authDetails, callbacks)
    }

    return (
        <div className="auth-outer">
            <PhoneFrame dark={false}>
            <div className="auth-screen">
                <div className="auth-banner">
                    <div className="auth-brand-lockup">
                        <img src="/logo2.png" alt="BiteRoll logo" className="auth-logo" />
                        <div className="auth-brand">BiteRoll<span className="auth-brand-dot" /></div>
                    </div>
                    <p className="auth-tagline">Swipe through nearby bites.</p>
                </div>
                <div className="auth-pane">
                    <form onSubmit={handleSubmit} className="auth-form">
                        <h1 className="auth-title">Welcome back</h1>
                        <p className="auth-subtitle">Sign in to keep rolling.</p>
                        <label className="auth-field">
                            <span>Email</span>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoComplete="email"
                            />
                        </label>
                        <label className="auth-field">
                            <span>Password</span>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </label>
                        <button type="submit" className="auth-submit">Sign in</button>
                        <Link to="/signup" className="auth-link">Don't have an account? Sign up</Link>
                    </form>
                </div>
            </div>
            </PhoneFrame>
        </div>

    )
}
