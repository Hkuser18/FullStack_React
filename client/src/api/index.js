// Single entry point for the API layer.
// Switch between in-browser mock and real Express server via .env:
//   VITE_USE_SERVER=false  →  MockApiService (localStorage, no server needed)
//   VITE_USE_SERVER=true   →  ServerApiService (Express on port 3001)
// חשוב: שני הקבצים חייבים לחשוף בדיוק את אותם שמות מתודות ואותה צורת תשובה
// (Promise שמחזיר את אותם שדות) - כי כל שאר האפליקציה מייבאת רק את Api הזה
// ולא יודעת (ולא צריכה לדעת) איזה מהשניים פועל מאחורי הקלעים.
import MockApi,  { ExamStatus } from './MockApiService';
import ServerApi               from './ServerApiService';

const Api = import.meta.env.VITE_USE_SERVER === 'true' ? ServerApi : MockApi;

export { ExamStatus };
export default Api;
