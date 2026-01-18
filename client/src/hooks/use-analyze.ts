import { useMutation } from "@tanstack/react-query";
import { api, type AnalysisRequest, type AnalysisResponse } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export function useAnalyzeVideo() {
  return useMutation({
    mutationFn: async (data: AnalysisRequest) => {
      const res = await apiRequest("POST", api.analyze.path, data);
      return res.json() as Promise<AnalysisResponse>;
    },
  });
}
