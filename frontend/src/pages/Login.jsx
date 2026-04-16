//
// Login page
//

import { useState } from 'react'
import { COG_USER_POOL_ID, COG_CLIENT_ID } from '../aws-config'
import { CognitoUserPool, CognitoUser , AuthenticationDetails } from 'amazon-cognito-identity-js'

const poolData = {
    UserPoolId: COG_USER_POOL_ID,
    ClientId: COG_CLIENT_ID
}

const userPool = new CognitoUserPool(poolData);

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    async function handleSubmit(e) {
        e.preventDefault()
        const userDetails = {
            Username: email,
            Password: password,
        };
        const userPoolDetails = {
            Username: email,
            Pool: userPool,
        }
        const callbacks = {
            onSuccess: (result) => {console.log(result)},
            onFailure: (err) => {console.log(err)},
            newPasswordRequired: () => {},

        };
        const authDetails = new AuthenticationDetails(userDetails);
        const cogUser = new CognitoUser(userPoolDetails);
        
        cogUser.setAuthenticationFlowType('USER_PASSWORD_AUTH')
        cogUser.authenticateUser(authDetails, callbacks)
    }

    return (
        <div className="login-outer-box">
            <div className="login-inner-box">
                <div className="login-cleft">
                    Banner will go here
                </div>
                <div>
                    <form onSubmit={handleSubmit} className="login-form">
                        <label>Enter You're Email
                            <input
                                type="text"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                />
                        </label>
                        <label>Enter You're Password
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                />
                        </label>
                        <button type="submit">Submit</button>
                    </form>
                </div>
            </div>
        </div>
    )
}