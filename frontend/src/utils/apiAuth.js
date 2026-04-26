import { CognitoUserPool } from 'amazon-cognito-identity-js'
import { COG_CLIENT_ID, COG_USER_POOL_ID } from '../aws-config.js'

const userPool = new CognitoUserPool({
    UserPoolId: COG_USER_POOL_ID,
    ClientId: COG_CLIENT_ID,
})

export function getAuthToken() {
    return new Promise((resolve, reject) => {
        const user = userPool.getCurrentUser()
        if (!user) {
            reject(new Error('No authenticated user'))
            return
        }

        user.getSession((err, session) => {
            if (err || !session?.isValid()) {
                reject(err || new Error('Invalid session'))
                return
            }

            resolve(session.getIdToken().getJwtToken())
        })
    })
}

export async function authHeaders() {
    const token = await getAuthToken()
    return {
        Authorization: token,
    }
}
