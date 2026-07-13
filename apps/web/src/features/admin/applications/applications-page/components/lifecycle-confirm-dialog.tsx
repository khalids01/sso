import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { lifecycleCopy } from "../lifecycle";
import type { PendingAction } from "../page-types";

export function LifecycleConfirmDialog(props: {
  action: PendingAction | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const copy = props.action ? lifecycleCopy(props.action) : null;

  return (
    <AlertDialog open={Boolean(props.action)} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant={copy?.destructive ? "destructive" : "default"}
            disabled={props.isLoading}
            onClick={props.onConfirm}
          >
            {props.isLoading ? "Working..." : copy?.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
