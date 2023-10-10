import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { loginUser, logoutUser } from "./asyncActions";
import { IUserResponse } from "app/types/User";

interface UserState {
  user: null | IUserResponse;
}

const initialState: UserState = {
  user: null,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, { payload }) => {
        localStorage.setItem("token", payload.data.accessToken);
        state.user = payload.data.user;
      })
      .addCase(logoutUser.fulfilled, () => {
        localStorage.removeItem("token");
      });
  },
});

export const {} = userSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectUser = (state: RootState) => state.user.user;

export default userSlice.reducer;