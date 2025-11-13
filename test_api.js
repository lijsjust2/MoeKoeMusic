// Test the API with quality=999
import axios from 'axios';

async function testApi() {
    try {
        const response = await axios.get('http://localhost:6521/song/url', {
            params: {
                cookie: 'token=0ca3a29ec925912a7de8b672740308292978dbda2c160efef6dba0caf6217a4f;userid=2240448372',
                hash: 'EB24EC0DB6E43BA2A4A875716C6E20E8',
                quality: 999
            }
        });
        console.log('API response status:', response.status);
        console.log('API response data:', response.data);
    } catch (error) {
        console.error('API error:', error.response ? error.response.status : error.message);
        console.error('Error data:', error.response ? error.response.data : {});
    }
}

testApi();