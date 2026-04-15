import {COG_CLIENT_ID, COGNITO_URL} from '../aws-config'

async function cognitoPost(target, body) {
    const rest = await fetch(COGNITO_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
        },
        body: JSON.stringify(body),
    });

    const response = await rest.json();
    if (!rest.ok) {
        throw new Error(response.message || response.__type || 'Cognito Error');
    }
    return response;
}

async function signup(username, email, password) {
    const body = {
        ClientId: COG_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
            { Name: 'email', Value: email},
            { Name: 'preferred_username', Value: username},
        ],
    }
    await cognitoPost('SignUp', body);
}