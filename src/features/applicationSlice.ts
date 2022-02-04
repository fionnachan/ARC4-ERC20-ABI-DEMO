import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { State } from "../store";
import algosdk, { Account } from "algosdk";

export type Wallet = {
  driver_name: string;
  driver_version: number;
  id: string;
  mnemonic_ux: boolean;
  name: string;
  supported_txs: string[];
};

export interface IApplicationState {
  algod: algosdk.Algodv2 | undefined;
  kmd: algosdk.Kmd | undefined;
  wallets: Wallet[] | undefined;
  wallet: Wallet | undefined;
  walletHandle: string;
  accounts: Account[] | undefined;
  acctInUse: Account | undefined;
  appId: number;
}

const initialState: IApplicationState = {
  algod: undefined,
  kmd: undefined,
  wallets: undefined,
  wallet: undefined,
  walletHandle: "",
  accounts: undefined,
  acctInUse: undefined,
  appId: 0,
};

export const getWallets = createAsyncThunk(
  "app/getWallets",
  async (arg: any, { getState }) => {
    const { app } = getState() as State;
    const wallets: Wallet[] = (await app.kmd!.listWallets()).wallets;
    return wallets;
  },
  {
    condition: (arg: any, { getState }) => {
      const { app } = getState() as State;
      if (!app.kmd) {
        return false;
      }
    },
  }
);

export const getAccounts = createAsyncThunk(
  "app/getAccounts",
  async (walletId: string, { getState }) => {
    const { app } = getState() as State;
    const walletHandle = (await app.kmd!.initWalletHandle(walletId, ""))
      .wallet_handle_token;
    const { addresses } = await app.kmd!.listKeys(walletHandle);
    const getAcctKeyPromises = addresses.map((addr: string) =>
      app.kmd!.exportKey(walletHandle, "", addr)
    );
    const acctKeys = await Promise.all(getAcctKeyPromises);
    const accounts = acctKeys.map(
      (acctKey, index) =>
        ({
          addr: addresses[index],
          sk: acctKey.private_key,
        } as Account)
    );
    return accounts;
  },
  {
    condition: (walletId: string, { getState }) => {
      const { app } = getState() as State;
      if (!app.kmd) {
        return false;
      }
    },
  }
);

export const applicationSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setAcctInUse(state, action) {
      state.acctInUse = action.payload;
    },
    setAlgod(state, action) {
      state.algod = action.payload;
    },
    setKmd(state, action) {
      state.kmd = action.payload;
    },
    setWallet(state, action) {
      state.wallet = state.wallets && state.wallets[action.payload];
    },
    setAppId(state, action) {
      state.appId = action.payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(
        getWallets.fulfilled,
        (state, action: PayloadAction<Wallet[]>) => {
          state.wallets = action.payload;
        }
      )
      .addCase(
        getAccounts.fulfilled,
        (state, action: PayloadAction<Account[]>) => {
          state.accounts = action.payload;
          state.acctInUse = action.payload[0];
        }
      );
  },
});

export const selectWallets = (state: State) => state.app.wallets;
export const selectWallet = (state: State) => state.app.wallet;
export const selectAccounts = (state: State) => state.app.accounts;
export const selectAcctInUse = (state: State) => state.app.acctInUse;
export const selectAlgod = (state: State) => state.app.algod;
export const selectKmd = (state: State) => state.app.kmd;
export const selectAppId = (state: State) => state.app.appId;

export const { setAcctInUse, setAlgod, setKmd, setWallet, setAppId } =
  applicationSlice.actions;

export default applicationSlice.reducer;
