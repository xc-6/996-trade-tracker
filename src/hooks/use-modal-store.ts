import { Account } from "@/features/account/schema";
import { BuyRecord, DivBatch, SellRecord } from "@/lib/types";
import { z } from "zod";
import { create } from "zustand";

export type ModalType =
  | "createAccount"
  | "createBuyRecord"
  | "editBuyRecord"
  | "createSellRecord"
  | "createRecordUpload"
  | "createDivBatch"
  | "editDivBatch"
  | "deleteAccount"
  | "updateStockCode";

interface ModalData {
  account?: z.infer<typeof Account> & { _id: string };
  buyRecord?: BuyRecord;
  sellRecord?: SellRecord;
  buyRecordId?: string;
  stockCode?: string;
  divBatch?: DivBatch;
  stockRecord?: any;
}

interface ModalStore {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
  setData: (data: ModalData) => void;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ type: null, isOpen: false }),
  setData: (data) => set({ data }),
}));
