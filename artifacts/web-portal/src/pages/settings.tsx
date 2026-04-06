import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetMe,
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListSettings,
  useUpdateSettings,
  getListSettingsQueryKey,
  useListDiscountRules,
  useCreateDiscountRule,
  useUpdateDiscountRule,
  useDeleteDiscountRule,
  useClearData,
} from "@workspace/api-client-react";
import type {
  UserProfile,
  SettingsMap,
  UpdateUserMutationError,
  CreateUserMutationError,
  UpdateSettingsMutationError,
  DiscountRule,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Moon, Sun, Languages, User, Receipt, Pencil, Trash2, Tag, AlertTriangle } from "lucide-react";

const pinSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});
type PinForm = z.infer<typeof pinSchema>;

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["owner", "staff"]),
});
type UserForm = z.infer<typeof userSchema>;

const editUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.enum(["owner", "staff"]),
});
type EditUserForm = z.infer<typeof editUserSchema>;

const billSettingsSchema = z.object({
  kitchen_name: z.string().min(1),
  kitchen_phone: z.string(),
  kitchen_address: z.string(),
  bill_tax_percent: z.string(),
  bill_discount_percent: z.string(),
  bill_thank_you_message: z.string(),
  bill_cta_text: z.string(),
  bill_website: z.string(),
});
type BillSettingsForm = z.infer<typeof billSettingsSchema>;

const discountRuleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["event", "threshold"]),
  discountType: z.enum(["pct", "pkr"]),
  amount: z.string().min(1),
  minOrderValue: z.string().optional(),
  active: z.boolean(),
});
type DiscountRuleForm = z.infer<typeof discountRuleSchema>;

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [userDialog, setUserDialog] = useState(false);
  const [editUserDialog, setEditUserDialog] = useState<UserProfile | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserProfile | null>(null);
  const [discountDialog, setDiscountDialog] = useState<DiscountRule | "new" | null>(null);
  const [deleteDiscountTarget, setDeleteDiscountTarget] = useState<DiscountRule | null>(null);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const me = useGetMe();
  const users = useListUsers();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const settings = useListSettings();
  const updateSettings = useUpdateSettings();
  const discountRules = useListDiscountRules();
  const createDiscountRule = useCreateDiscountRule();
  const updateDiscountRule = useUpdateDiscountRule();
  const deleteDiscountRule = useDeleteDiscountRule();
  const clearData = useClearData();

  const isOwner = me.data?.role === "owner";

  const pinForm = useForm<PinForm>({
    resolver: zodResolver(pinSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", password: "", role: "staff" },
  });

  const editUserForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "staff" },
  });

  const billForm = useForm<BillSettingsForm>({
    resolver: zodResolver(billSettingsSchema),
    defaultValues: {
      kitchen_name: "",
      kitchen_phone: "",
      kitchen_address: "",
      bill_tax_percent: "0",
      bill_discount_percent: "0",
      bill_thank_you_message: "Thank you for your order!",
      bill_cta_text: "",
      bill_website: "",
    },
  });

  const discountForm = useForm<DiscountRuleForm>({
    resolver: zodResolver(discountRuleSchema),
    defaultValues: { name: "", type: "event", discountType: "pct", amount: "", minOrderValue: "", active: true },
  });

  useEffect(() => {
    if (settings.data) {
      const s: SettingsMap = settings.data;
      billForm.reset({
        kitchen_name: s.kitchen_name ?? "MUFAZ Kitchen",
        kitchen_phone: s.kitchen_phone ?? "",
        kitchen_address: s.kitchen_address ?? "",
        bill_tax_percent: s.bill_tax_percent ?? "0",
        bill_discount_percent: s.bill_discount_percent ?? "0",
        bill_thank_you_message: s.bill_thank_you_message ?? "Thank you for your order!",
        bill_cta_text: s.bill_cta_text ?? "",
        bill_website: s.bill_website ?? "",
      });
    }
  }, [settings.data]);

  useEffect(() => {
    if (editUserDialog) {
      editUserForm.reset({
        name: editUserDialog.name,
        email: editUserDialog.email,
        password: "",
        role: editUserDialog.role as "owner" | "staff",
      });
    }
  }, [editUserDialog]);

  useEffect(() => {
    if (discountDialog && discountDialog !== "new") {
      discountForm.reset({
        name: discountDialog.name,
        type: discountDialog.type,
        discountType: discountDialog.discountType,
        amount: discountDialog.amount,
        minOrderValue: discountDialog.minOrderValue ?? "",
        active: discountDialog.active,
      });
    } else if (discountDialog === "new") {
      discountForm.reset({ name: "", type: "event", discountType: "pct", amount: "", minOrderValue: "", active: true });
    }
  }, [discountDialog]);

  const toggleDarkMode = (on: boolean) => {
    setDarkMode(on);
    if (on) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const onUpdatePassword = (values: PinForm) => {
    if (!me.data?.id) return;
    updateUser.mutate(
      { id: me.data.id, data: { password: values.newPassword } },
      {
        onSuccess: () => {
          toast({ title: t("Password Updated") });
          pinForm.reset();
        },
        onError: (err: UpdateUserMutationError) => {
          toast({ variant: "destructive", title: t("Error"), description: err.message || t("Failed to update password") });
        },
      }
    );
  };

  const onCreateUser = (values: UserForm) => {
    createUser.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: t("User Created") });
          qc.invalidateQueries({ queryKey: ["listUsers"] });
          setUserDialog(false);
          userForm.reset();
        },
        onError: (err: CreateUserMutationError) => {
          toast({ variant: "destructive", title: t("Error"), description: err.message || t("Failed to create user") });
        },
      }
    );
  };

  const onEditUser = (values: EditUserForm) => {
    if (!editUserDialog) return;
    const data: Record<string, string> = { name: values.name, email: values.email, role: values.role };
    if (values.password) data.password = values.password;
    updateUser.mutate(
      { id: editUserDialog.id, data },
      {
        onSuccess: () => {
          toast({ title: t("User Updated") });
          qc.invalidateQueries({ queryKey: ["listUsers"] });
          setEditUserDialog(null);
        },
        onError: (err: UpdateUserMutationError) => {
          toast({ variant: "destructive", title: t("Error"), description: err.message || t("Failed to update user") });
        },
      }
    );
  };

  const onDeleteUser = () => {
    if (!deleteUserTarget) return;
    deleteUser.mutate(
      { id: deleteUserTarget.id },
      {
        onSuccess: () => {
          toast({ title: t("User Deleted") });
          qc.invalidateQueries({ queryKey: ["listUsers"] });
          setDeleteUserTarget(null);
        },
        onError: () => {
          toast({ variant: "destructive", title: t("Error"), description: t("Failed to delete user") });
        },
      }
    );
  };

  const onSaveBillSettings = (values: BillSettingsForm) => {
    updateSettings.mutate(
      { data: values as SettingsMap },
      {
        onSuccess: () => {
          toast({ title: t("Bill Settings Saved") });
          qc.invalidateQueries({ queryKey: getListSettingsQueryKey() });
        },
        onError: (err: UpdateSettingsMutationError) => {
          toast({ variant: "destructive", title: t("Error"), description: err.message || t("Failed to save settings") });
        },
      }
    );
  };

  const onSaveDiscountRule = (values: DiscountRuleForm) => {
    const body = {
      ...values,
      minOrderValue: values.minOrderValue && values.minOrderValue.trim() !== "" ? values.minOrderValue : undefined,
    };
    if (discountDialog && discountDialog !== "new") {
      updateDiscountRule.mutate(
        { id: discountDialog.id, data: body },
        {
          onSuccess: () => {
            toast({ title: t("Discount Rule Updated") });
            qc.invalidateQueries({ queryKey: ["/api/settings/discount-rules"] });
            setDiscountDialog(null);
          },
          onError: () => {
            toast({ variant: "destructive", title: t("Error"), description: t("Failed to update discount rule") });
          },
        }
      );
    } else {
      createDiscountRule.mutate(
        { data: body },
        {
          onSuccess: () => {
            toast({ title: t("Discount Rule Created") });
            qc.invalidateQueries({ queryKey: ["/api/settings/discount-rules"] });
            setDiscountDialog(null);
          },
          onError: () => {
            toast({ variant: "destructive", title: t("Error"), description: t("Failed to create discount rule") });
          },
        }
      );
    }
  };

  const onDeleteDiscountRule = () => {
    if (!deleteDiscountTarget) return;
    deleteDiscountRule.mutate(
      { id: deleteDiscountTarget.id },
      {
        onSuccess: () => {
          toast({ title: t("Discount Rule Deleted") });
          qc.invalidateQueries({ queryKey: ["/api/settings/discount-rules"] });
          setDeleteDiscountTarget(null);
        },
        onError: () => {
          toast({ variant: "destructive", title: t("Error"), description: t("Failed to delete discount rule") });
        },
      }
    );
  };

  const onClearData = () => {
    clearData.mutate(undefined, {
      onSuccess: () => {
        toast({ title: t("Data Cleared"), description: t("All orders and logs have been cleared.") });
        qc.invalidateQueries();
        setClearDialogOpen(false);
        setClearConfirmText("");
      },
      onError: () => {
        toast({ variant: "destructive", title: t("Error"), description: t("Failed to clear data") });
      },
    });
  };

  const discountRuleType = discountForm.watch("type");

  return (
    <div className="space-y-6 max-w-2xl" data-testid="page-settings">
      <h1 className="text-2xl font-bold">{t("Settings")}</h1>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">{t("General")}</TabsTrigger>
          <TabsTrigger value="security">{t("Security")}</TabsTrigger>
          {isOwner && <TabsTrigger value="bill">{t("Bill")}</TabsTrigger>}
          {isOwner && <TabsTrigger value="users">{t("Users")}</TabsTrigger>}
          {isOwner && <TabsTrigger value="discounts">{t("Discounts")}</TabsTrigger>}
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Appearance")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <Label>{t("Dark Mode")}</Label>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} data-testid="switch-dark-mode" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  <Label>{t("Language")}</Label>
                </div>
                <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "ur")}>
                  <SelectTrigger className="w-32" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ur">اردو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("About")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Application")}</span>
                <span className="font-medium">MUFAZ Kitchen POS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Version")}</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Logged in as")}</span>
                <span className="font-medium">{me.data?.name} ({me.data?.role})</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Change Password")}</CardTitle>
              <CardDescription>{t("Update your account password")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pinForm}>
                <form onSubmit={pinForm.handleSubmit(onUpdatePassword)} className="space-y-4">
                  <FormField control={pinForm.control} name="currentPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Current Password")}</FormLabel>
                      <FormControl><Input type="password" {...field} data-testid="input-current-password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={pinForm.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("New Password")}</FormLabel>
                      <FormControl><Input type="password" {...field} data-testid="input-new-password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={updateUser.isPending} data-testid="button-update-password">
                    {t("Update Password")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bill Settings (owner only) */}
        {isOwner && (
          <TabsContent value="bill" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  {t("Bill / Invoice Settings")}
                </CardTitle>
                <CardDescription>{t("Customize the information shown on every receipt")}</CardDescription>
              </CardHeader>
              <CardContent>
                {settings.isLoading ? (
                  <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : (
                  <Form {...billForm}>
                    <form onSubmit={billForm.handleSubmit(onSaveBillSettings)} className="space-y-4">
                      <div className="border-b pb-4 space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{t("Business Info")}</p>
                        <FormField control={billForm.control} name="kitchen_name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Business Name")}</FormLabel>
                            <FormControl><Input {...field} data-testid="input-kitchen-name" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={billForm.control} name="kitchen_phone" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Phone")}</FormLabel>
                              <FormControl><Input {...field} data-testid="input-kitchen-phone" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={billForm.control} name="bill_website" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Website")}</FormLabel>
                              <FormControl><Input placeholder="www.example.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={billForm.control} name="kitchen_address" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Address")}</FormLabel>
                            <FormControl><Input {...field} data-testid="input-kitchen-address" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="border-b pb-4 space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{t("Pricing")}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={billForm.control} name="bill_discount_percent" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Discount")} %</FormLabel>
                              <FormControl><Input type="number" min="0" max="100" step="0.01" {...field} data-testid="input-discount-percent" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={billForm.control} name="bill_tax_percent" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Tax")} %</FormLabel>
                              <FormControl><Input type="number" min="0" max="100" step="0.01" {...field} data-testid="input-tax-percent" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <p className="text-xs text-muted-foreground">{t("Applied automatically when generating a new bill")}</p>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{t("Receipt Footer")}</p>
                        <FormField control={billForm.control} name="bill_thank_you_message" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Thank-You Message")}</FormLabel>
                            <FormControl><Textarea rows={2} {...field} data-testid="input-thank-you-message" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={billForm.control} name="bill_cta_text" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("CTA / Promo Text")}</FormLabel>
                            <FormControl><Textarea rows={2} placeholder={t("e.g. Order again on WhatsApp: +92-300-0000000")} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <Button type="submit" disabled={updateSettings.isPending} data-testid="button-save-bill-settings">
                        {t("Save Bill Settings")}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Users (owner only) */}
        {isOwner && (
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t("Manage staff accounts")}</p>
              <Button size="sm" onClick={() => { userForm.reset(); setUserDialog(true); }} data-testid="button-add-user">
                <Plus className="w-4 h-4 mr-2" /> {t("Add User")}
              </Button>
            </div>
            {users.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
              <div className="space-y-2">
                {users.data?.map((u: UserProfile) => (
                  <Card key={u.id} data-testid={`card-user-${u.id}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <Badge variant={u.role === "owner" ? "default" : "outline"} className="text-xs">
                          {u.role}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditUserDialog(u)}
                            data-testid={`button-edit-user-${u.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          {u.id !== me.data?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteUserTarget(u)}
                              data-testid={`button-delete-user-${u.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Danger Zone */}
            <Card className="border-destructive/50 mt-6">
              <CardHeader>
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t("Danger Zone")}
                </CardTitle>
                <CardDescription>{t("Irreversible actions — proceed with caution")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("Clear All Orders & Logs")}</p>
                    <p className="text-xs text-muted-foreground">{t("Permanently clears all orders, bills, inventory logs, and scheduled orders. Cannot be undone.")}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { setClearConfirmText(""); setClearDialogOpen(true); }}
                    data-testid="button-clear-data"
                  >
                    {t("Clear Data")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Discounts (owner only) */}
        {isOwner && (
          <TabsContent value="discounts" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("Discount Rules")}</p>
                <p className="text-xs text-muted-foreground">{t("Event discounts and order-value thresholds shown as suggestions when creating orders")}</p>
              </div>
              <Button size="sm" onClick={() => setDiscountDialog("new")} data-testid="button-add-discount-rule">
                <Plus className="w-4 h-4 mr-2" /> {t("Add Rule")}
              </Button>
            </div>
            {discountRules.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : discountRules.data?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("No discount rules yet")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {discountRules.data?.map((rule: DiscountRule) => (
                  <Card key={rule.id} data-testid={`card-discount-rule-${rule.id}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{rule.name}</p>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {rule.type === "event" ? t("Event") : t("Threshold")}
                            </Badge>
                            {!rule.active && <Badge variant="secondary" className="text-xs shrink-0">{t("Inactive")}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {rule.discountType === "pct" ? `${rule.amount}%` : `PKR ${rule.amount}`}
                            {rule.minOrderValue ? ` · ${t("Min order")}: PKR ${rule.minOrderValue}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDiscountDialog(rule)}
                            data-testid={`button-edit-discount-${rule.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteDiscountTarget(rule)}
                            data-testid={`button-delete-discount-${rule.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Add user dialog */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Add User")}</DialogTitle></DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onCreateUser)} className="space-y-4">
              <FormField control={userForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>{t("Name")}</FormLabel><FormControl><Input {...field} data-testid="input-user-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={userForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>{t("Email")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={userForm.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>{t("Password")}</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={userForm.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>{t("Role")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUserDialog(false)}>{t("Cancel")}</Button>
                <Button type="submit" disabled={createUser.isPending} data-testid="button-save-user">{t("Create")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUserDialog} onOpenChange={(o) => !o && setEditUserDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Edit User")}</DialogTitle></DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(onEditUser)} className="space-y-4">
              <FormField control={editUserForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>{t("Name")}</FormLabel><FormControl><Input {...field} data-testid="input-edit-user-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editUserForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>{t("Email")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editUserForm.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>{t("New Password")} ({t("optional")})</FormLabel><FormControl><Input type="password" placeholder={t("Leave blank to keep current")} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editUserForm.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>{t("Role")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditUserDialog(null)}>{t("Cancel")}</Button>
                <Button type="submit" disabled={updateUser.isPending} data-testid="button-save-edit-user">{t("Save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete user confirm */}
      <AlertDialog open={!!deleteUserTarget} onOpenChange={(o) => !o && setDeleteUserTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete User")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete")} <strong>{deleteUserTarget?.name}</strong>? {t("This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-user">
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discount rule dialog */}
      <Dialog open={!!discountDialog} onOpenChange={(o) => !o && setDiscountDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{discountDialog === "new" ? t("Add Discount Rule") : t("Edit Discount Rule")}</DialogTitle>
          </DialogHeader>
          <Form {...discountForm}>
            <form onSubmit={discountForm.handleSubmit(onSaveDiscountRule)} className="space-y-4">
              <FormField control={discountForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>{t("Name")}</FormLabel><FormControl><Input placeholder={t("e.g. Ramadan Special, Big Order Reward")} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={discountForm.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>{t("Type")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="event">{t("Special Event")}</SelectItem>
                        <SelectItem value="threshold">{t("Order Threshold")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={discountForm.control} name="discountType" render={({ field }) => (
                  <FormItem><FormLabel>{t("Discount Type")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pct">% {t("Percentage")}</SelectItem>
                        <SelectItem value="pkr">PKR {t("Fixed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={discountForm.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Amount")} ({discountForm.watch("discountType") === "pct" ? "%" : "PKR"})</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {discountRuleType === "threshold" && (
                  <FormField control={discountForm.control} name="minOrderValue" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Min Order Value")} (PKR)</FormLabel>
                      <FormControl><Input type="number" min="0" step="1" placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
              <FormField control={discountForm.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">{t("Active")}</FormLabel>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDiscountDialog(null)}>{t("Cancel")}</Button>
                <Button type="submit" disabled={createDiscountRule.isPending || updateDiscountRule.isPending} data-testid="button-save-discount-rule">{t("Save")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete discount rule confirm */}
      <AlertDialog open={!!deleteDiscountTarget} onOpenChange={(o) => !o && setDeleteDiscountTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Discount Rule")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete")} <strong>{deleteDiscountTarget?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteDiscountRule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear data confirmation dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={(o) => { if (!o) { setClearDialogOpen(false); setClearConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{t("Clear All Orders & Logs")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">{t("This will permanently clear ALL orders, bills, inventory logs, and scheduled orders. This cannot be undone.")}</span>
              <span className="block font-medium">{t("Type CLEAR to confirm:")}</span>
              <Input
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="CLEAR"
                data-testid="input-clear-confirm"
                className="mt-2"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setClearConfirmText(""); }}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onClearData}
              disabled={clearConfirmText !== "CLEAR" || clearData.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-clear-data"
            >
              {clearData.isPending ? t("Clearing...") : t("Clear All Data")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
