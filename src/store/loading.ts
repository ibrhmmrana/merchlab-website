import { create } from 'zustand';

interface LoadingState {
  isPageLoading: boolean;
  isDataLoading: boolean;
  loadingText: string;
  setPageLoading: (loading: boolean, text?: string) => void;
  setDataLoading: (loading: boolean, text?: string) => void;
  setLoading: (loading: boolean, text?: string) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isPageLoading: false,
  isDataLoading: false,
  loadingText: "Loading...",
  
  setPageLoading: (loading: boolean, text = "Loading page...") => 
    set({ isPageLoading: loading, loadingText: text }),
    
  setDataLoading: (loading: boolean, text = "Loading data...") => 
    set({ isDataLoading: loading, loadingText: text }),
    
  setLoading: (loading: boolean, text = "Loading...") => 
    set({ isPageLoading: loading, isDataLoading: loading, loadingText: text }),
}));
