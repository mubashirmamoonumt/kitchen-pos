import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetBill, useListSettings } from "@workspace/api-client-react";
import type { BillDetail, BillItem, SettingsMap } from "@workspace/api-client-react";

interface ExtendedBillDetail extends BillDetail {
  billNumber?: string | null;
  subtotal?: string | null;
  discount?: string | null;
  tax?: string | null;
}

export default function BillsPrint() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const billId = parseInt(params.id ?? "0");

  const bill = useGetBill(billId, { query: { enabled: !!billId, queryKey: ["getBill", billId] } });
  const settingsQuery = useListSettings();

  const b = bill.data as ExtendedBillDetail | undefined;
  const settings: SettingsMap = settingsQuery.data ?? {};

  const isReady = !bill.isLoading && !settingsQuery.isLoading && !!b;

  useEffect(() => {
    if (isReady) {
      setTimeout(() => {
        window.print();
      }, 400);
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ fontFamily: "monospace", color: "#666" }}>Loading receipt…</p>
      </div>
    );
  }

  const kitchenName = settings.kitchen_name || "MUFAZ Kitchen";
  const kitchenPhone = settings.kitchen_phone || "";
  const kitchenAddress = settings.kitchen_address || "";
  const website = settings.bill_website || "";
  const thankYou = settings.bill_thank_you_message || "Thank you for your order!";
  const cta = settings.bill_cta_text || "";

  const subtotal = parseFloat(b.subtotal ?? b.totalAmount ?? "0");
  const discount = parseFloat(b.discount ?? "0");
  const tax = parseFloat(b.tax ?? "0");
  const total = parseFloat(b.totalAmount ?? "0");
  const billNumber = b.billNumber ?? `#${b.id}`;

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <style>{`
        @media screen {
          body { background: #f0f0f0; display: flex; justify-content: center; padding: 24px; }
          .receipt { background: #fff; padding: 24px; max-width: 340px; width: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .no-print { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
          button { font-family: monospace; font-size: 12px; padding: 6px 14px; cursor: pointer; border: 1px solid #999; background: #fff; border-radius: 4px; }
        }
        @media print {
          body { background: #fff; padding: 0; }
          .receipt { box-shadow: none; padding: 0; }
          .no-print { display: none !important; }
        }
        .receipt { font-family: monospace; font-size: 12px; }
        h2 { text-align: center; margin: 0 0 2px; font-size: 15px; }
        .center { text-align: center; color: #666; margin: 2px 0; font-size: 11px; }
        .divider { border: none; border-top: 1px dashed #999; margin: 8px 0; }
        .divider-solid { border: none; border-top: 1px solid #000; margin: 8px 0; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; margin: 4px 0; font-size: 11px; }
        .meta span.label { color: #666; }
        .items { width: 100%; border-collapse: collapse; margin: 4px 0; }
        .items td { padding: 2px 0; font-size: 11px; }
        .items td:last-child { text-align: right; }
        .totals { width: 100%; border-collapse: collapse; }
        .totals td { padding: 2px 0; font-size: 11px; }
        .totals td:last-child { text-align: right; }
        .discount { color: #16a34a; }
        .total-row td { font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 4px; }
        .footer { text-align: center; color: #555; margin-top: 8px; font-size: 11px; }
      `}</style>
      <div className="receipt">
        <h2>{kitchenName}</h2>
        {kitchenPhone && <p className="center">{kitchenPhone}</p>}
        {kitchenAddress && <p className="center">{kitchenAddress}</p>}
        {website && <p className="center">{website}</p>}
        <hr className="divider-solid" />
        <p className="center"><strong>Invoice {billNumber}</strong></p>
        <p className="center">{new Date(b.createdAt).toLocaleString()}</p>
        <hr className="divider" />
        <div className="meta">
          <span><span className="label">Customer: </span>{b.order?.customerName || "Walk-in"}</span>
          <span><span className="label">Payment: </span><span style={{ textTransform: "capitalize" }}>{b.paymentMethod}</span></span>
          <span><span className="label">Order #: </span>{b.orderId}</span>
        </div>
        <hr className="divider" />
        <table className="items">
          <tbody>
            {b.items?.map((item: BillItem) => (
              <tr key={item.id}>
                <td>{item.itemName} × {item.quantity}</td>
                <td>PKR {(parseFloat(item.unitPrice) * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr className="divider" />
        <table className="totals">
          <tbody>
            <tr><td>Subtotal</td><td>PKR {fmt(subtotal)}</td></tr>
            {discount > 0 && (
              <tr className="discount"><td>Discount</td><td>-PKR {fmt(discount)}</td></tr>
            )}
            {tax > 0 && (
              <tr><td>Tax</td><td>PKR {fmt(tax)}</td></tr>
            )}
            <tr className="total-row"><td>TOTAL</td><td>PKR {fmt(total)}</td></tr>
          </tbody>
        </table>
        {(thankYou || cta) && (
          <>
            <hr className="divider" />
            <div className="footer">
              {thankYou && <p><strong>{thankYou}</strong></p>}
              {cta && <p>{cta}</p>}
            </div>
          </>
        )}
        <div className="no-print">
          <button onClick={() => window.print()}>Print</button>
          <button onClick={() => navigate("/bills")}>Back</button>
        </div>
      </div>
    </>
  );
}
