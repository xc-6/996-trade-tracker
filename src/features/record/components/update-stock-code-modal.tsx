import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { z } from "zod";
import { useUpdateStockCode } from "../hooks/use-update-stock-code";

const VALID_PREFIXES = ["SH", "SZ", "US", "HK"] as const;

const formSchema = z.object({
  oldStockCode: z.string().min(1, "Stock code is required"),
  newStockCode: z
    .string()
    .min(3, "Stock code must be at least 3 characters")
    .refine(
      (code) => {
        const prefix = code.slice(0, 2);
        return VALID_PREFIXES.includes(prefix as any);
      },
      {
        message: "Stock code must start with SH, SZ, US, or HK; Case Sensitive",
      },
    ),
});

type FormValues = z.infer<typeof formSchema>;

export const UpdateStockCodeModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const mutation = useUpdateStockCode();

  const isModalOpen = isOpen && type === "updateStockCode";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldStockCode: data?.stockRecord?.stockCode || "",
      newStockCode: "",
    },
  });

  // Update form when modal data changes
  useEffect(() => {
    if (isModalOpen && data?.stockRecord?.stockCode) {
      form.reset({
        oldStockCode: data.stockRecord.stockCode,
        newStockCode: "",
      });
    }
  }, [isModalOpen, data?.stockRecord?.stockCode, form]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    mutation.mutate(
      {
        oldStockCode: values.oldStockCode,
        newStockCode: values.newStockCode,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Update Stock Code
          </DialogTitle>
          <DialogDescription className="text-center">
            Change the stock code for all related records
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4 px-6">
              <FormField
                control={form.control}
                name="oldStockCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled
                        placeholder="Current stock code"
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newStockCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Stock Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={mutation.isPending}
                        placeholder="Enter new stock code"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="px-6 pb-4">
              <Button
                onClick={handleClose}
                variant="outline"
                type="button"
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
