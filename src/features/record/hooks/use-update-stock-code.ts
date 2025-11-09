import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.records)["update-stock-code"]["$post"]
>;
type RequestType = InferRequestType<
  (typeof client.api.records)["update-stock-code"]["$post"]
>["json"];

export const useUpdateStockCode = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.records["update-stock-code"]["$post"]({
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to update stock code");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Stock code updated successfully");
      queryClient.invalidateQueries({ queryKey: ["buyRecords"] });
      queryClient.invalidateQueries({ queryKey: ["recordsByStock"] });
    },
    onError: () => {
      toast.error("Failed to update stock code");
    },
  });

  return mutation;
};
