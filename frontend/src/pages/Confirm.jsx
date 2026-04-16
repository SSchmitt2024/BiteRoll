import { useState } from 'react'
import { COG_USER_POOL_ID, COG_CLIENT_ID } from '../aws-config'
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js'

const poolData = {
    UserPoolId: COG_USER_POOL_ID,
    ClientId: COG_CLIENT_ID
}

const userPool = new CognitoUserPool(poolData);


export default function Confirm() {
    const [ code, setCode ] = useState('');
    const email = 'sawyerals.nh@gmail.com'


    async function handleSubmit(e) {
        e.preventDefault();
        const userPoolDetails = {
            Username: email,
            Pool: userPool,
        }
        const cogUser = new CognitoUser(userPoolDetails);
        
        cogUser.confirmRegistration(code, true, (err, result) => {
            if (err) { 
                console.log(err); 
                return 
            }
            console.log(result)
        })
    }

    return (
        <div className='confirm-outer-box'>
            <form  onSubmit={handleSubmit} className='confirm-form'>
                <label>Enter your code
                    <input
                    type='text'
                    value={code}
                    onChange={e => setCode(e.target.value)}/>
                </label>
                <button type="submit">Submit</button>
            </form>
        </div>
    )
}