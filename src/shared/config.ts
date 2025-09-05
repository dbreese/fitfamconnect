if (typeof __API_SERVER__ === 'undefined') {
    console.log('VUE API_SERVER DEFINE CONFIG NOT DEFINED.');
}

export const API_SERVER =
    typeof process !== 'undefined' && process.env?.API_SERVER // Backend
        ? process.env.API_SERVER
        : __API_SERVER__; // Frontend from vite define config

if (!API_SERVER) {
    throw new Error('API_SERVER is not defined!');
}
