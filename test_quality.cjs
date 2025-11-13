const songUrlModule = require('./api/module/song_url');

// Mock the useAxios function
const mockUseAxios = (config) => {
    console.log('Generated dataMap:', config.params);
    return Promise.resolve({ data: { success: true } });
};

// Test with quality as string '999'
console.log('Testing with quality as string "999":');
songUrlModule({ quality: '999', hash: 'test_hash' }, mockUseAxios);

// Test with quality as number 999
console.log('\nTesting with quality as number 999:');
songUrlModule({ quality: 999, hash: 'test_hash' }, mockUseAxios);

// Test with quality as string 'flac'
console.log('\nTesting with quality as string "flac":');
songUrlModule({ quality: 'flac', hash: 'test_hash' }, mockUseAxios);

// Test with quality as string '320'
console.log('\nTesting with quality as string "320":');
songUrlModule({ quality: '320', hash: 'test_hash' }, mockUseAxios);

// Test with quality as string '128'
console.log('\nTesting with quality as string "128":');
songUrlModule({ quality: '128', hash: 'test_hash' }, mockUseAxios);