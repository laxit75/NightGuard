import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE = "http://localhost:5000/api"; // to be changed after deploy

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const getSites = async () => {
  const res = await api.get("/config/sites");
  return res.data;
};

export default api;
