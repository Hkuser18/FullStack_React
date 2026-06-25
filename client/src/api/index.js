// Single entry point for the API layer.
// Switch between in-browser mock and real Express server via .env:
//   VITE_USE_SERVER=false  →  MockApiService (localStorage, no server needed)
//   VITE_USE_SERVER=true   →  ServerApiService (Express on port 3001)
import MockApi,  { ExamStatus } from './MockApiService';
import ServerApi               from './ServerApiService';

const Api = import.meta.env.VITE_USE_SERVER === 'true' ? ServerApi : MockApi;

export { ExamStatus };
export default Api;
