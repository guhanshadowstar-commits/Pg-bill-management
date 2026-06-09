import Link from "next/link";
import { Card } from "@/components/ui/card";

const guideSections = [
  {
    title: "1. Start Here",
    purpose: "Use this order when setting up a new PG account.",
    steps: [
      "Go to Rooms and add every real room first.",
      "Go to Tenants and add each tenant's name and phone number.",
      "Assign each tenant to a room with the correct check-in date.",
      "When the EB bill arrives, go to Bills and generate the split.",
      "Use History anytime to verify who stayed, joined, or left."
    ],
    notes: ["Do not add fake/demo data. The app is designed to start empty."]
  },
  {
    title: "2. Dashboard",
    purpose: "Use Dashboard to see the PG status quickly.",
    steps: [
      "Open Dashboard from the top menu.",
      "Check Total Rooms to know how many rooms are configured.",
      "Check Active Tenants to see tenants currently staying.",
      "Check Revenue to see paid collections for the current month.",
      "Check Pending Payments to see unpaid bill splits."
    ],
    notes: ["Dashboard updates after you add rooms, tenants, bills, and payments."]
  },
  {
    title: "3. Add Room",
    purpose: "Create a room before assigning tenants.",
    steps: [
      "Open Rooms.",
      "Enter Room Number, for example your real room number.",
      "Enter Sharing Type, such as 2, 3, 4, or 5.",
      "Enter Meter Number if the room has a separate meter.",
      "Click Add Room."
    ],
    notes: ["Room numbers must be unique.", "If you do not know the meter number, leave it blank."]
  },
  {
    title: "4. Change Room Status",
    purpose: "Mark a room active or inactive.",
    steps: [
      "Open Rooms.",
      "Find the room in the table.",
      "Click Toggle in the Action column.",
      "The status changes between active and inactive."
    ],
    notes: ["Inactive rooms are still kept in history. Do not delete data for normal operations."]
  },
  {
    title: "5. Add Tenant",
    purpose: "Save a tenant profile before assigning a stay.",
    steps: [
      "Open Tenants.",
      "In Add Tenant, enter Full Name.",
      "Enter Phone number if available.",
      "Click Add Tenant."
    ],
    notes: ["Adding a tenant does not assign a room yet. Use Assign Tenant after this."]
  },
  {
    title: "6. Assign Tenant To Room",
    purpose: "Create the stay record that billing uses.",
    steps: [
      "Open Tenants.",
      "In Assign Tenant, choose the room.",
      "Choose the tenant.",
      "Select the correct Check-in date.",
      "Leave Check-out blank if the tenant is still staying.",
      "Click Save."
    ],
    notes: [
      "This creates an occupancy log.",
      "The EB bill calculation depends on these dates, so enter them carefully."
    ]
  },
  {
    title: "7. Tenant Leaves / Checkout",
    purpose: "Record outgoers without losing history.",
    steps: [
      "Open Tenants.",
      "Find the tenant's occupancy row.",
      "Click Check out.",
      "Enter the leaving date in YYYY-MM-DD format.",
      "Confirm and save."
    ],
    notes: [
      "Do not delete the row when a tenant leaves.",
      "Checkout preserves history and allows old bills to be audited later."
    ]
  },
  {
    title: "8. Edit Checkout Date",
    purpose: "Fix a wrong leaving date.",
    steps: [
      "Open Tenants.",
      "Find the checked-out occupancy row.",
      "Click Edit checkout.",
      "Enter the correct date.",
      "To make the tenant active again, clear the date and save."
    ],
    notes: ["Use this only to correct mistakes."]
  },
  {
    title: "9. Generate EB Bill",
    purpose: "Split the room electricity bill fairly.",
    steps: [
      "Open Bills.",
      "Enter Room Number exactly as saved in Rooms.",
      "Choose the billing month.",
      "In Total Bill, enter the full EB bill amount for that room.",
      "Click Calculate to preview the split.",
      "Click Save Bill to store it."
    ],
    notes: [
      "Total Bill means the full electricity bill amount for that room.",
      "Example: if the room EB bill is Rs.3000, type 3000.",
      "Do not type units, meter reading, or per-person amount in Total Bill."
    ]
  },
  {
    title: "10. Billing Formula",
    purpose: "Understand how the split is calculated.",
    steps: [
      "The app counts each tenant's days stayed in the selected month.",
      "It adds all tenant days to get Total Person-Days.",
      "It calculates Per Day Cost = Total Bill / Total Person-Days.",
      "It calculates Tenant Amount = Tenant Days x Per Day Cost."
    ],
    notes: [
      "Empty beds are not charged.",
      "Mid-month joining and early leaving are handled automatically.",
      "Only dates overlapping with the selected billing month are counted."
    ]
  },
  {
    title: "11. Save Bill",
    purpose: "Store the bill split for future tracking.",
    steps: [
      "After calculating, review the tenant amounts.",
      "If the split looks correct, click Save Bill.",
      "The saved bill appears under Generated Bills.",
      "Use the saved bill to track pending and paid payments."
    ],
    notes: ["If you made a mistake, correct the tenant dates or bill amount and save again."]
  },
  {
    title: "12. Mark Payment Paid",
    purpose: "Track who paid their EB share.",
    steps: [
      "Open Bills.",
      "Find the saved bill.",
      "Find the tenant row.",
      "Click Mark Paid.",
      "The tenant split status changes from pending to paid."
    ],
    notes: ["Dashboard revenue and pending payment numbers update after payment is saved."]
  },
  {
    title: "13. History Page",
    purpose: "See incomers, outgoers, active stays, and old stays.",
    steps: [
      "Open History.",
      "Use the search box to find tenant, room, or phone.",
      "Use the filter to show All records, Active only, or Checked out only.",
      "Check Check-in, Check-out, Days, and Status."
    ],
    notes: [
      "History shows the past 3 years of occupancy records.",
      "This is the proof for old EB calculations."
    ]
  },
  {
    title: "14. AI Occupancy Parser",
    purpose: "Convert plain English occupancy notes into structured date ranges.",
    steps: [
      "Open Bills.",
      "Type a natural language note in AI Occupancy Parser.",
      "Click Parse.",
      "Review the generated tenant date ranges.",
      "Use the result as a guide when entering tenant check-in/check-out dates."
    ],
    notes: [
      "The parser does not replace proper tenant entry.",
      "Always verify dates before saving bills."
    ]
  },
  {
    title: "15. AI Help",
    purpose: "Ask questions about how to use the app.",
    steps: [
      "Open AI Help.",
      "Click a quick question or type your own question.",
      "Read the answer.",
      "Use it for help with calculation, tenant entry, checkout, history, payments, and database setup."
    ],
    notes: [
      "The app works without a paid OpenAI key.",
      "Without an API key, AI Help uses built-in guidance."
    ]
  },
  {
    title: "16. Common Mistakes To Avoid",
    purpose: "Prevent wrong bills and lost records.",
    steps: [
      "Do not enter per-person amount in Total Bill.",
      "Do not delete occupancy rows when someone leaves.",
      "Do not create demo rooms or tenants in production.",
      "Do not run seed data if you want the app empty.",
      "Do not paste JSON into Supabase SQL Editor.",
      "Do not expose the Supabase service role key publicly."
    ],
    notes: ["If something looks wrong, check room number, month, tenant dates, and total bill first."]
  },
  {
    title: "17. PG Owner Login",
    purpose: "Protect the app so only approved PG owner accounts can use it.",
    steps: [
      "Open the live app URL.",
      "If this is your first time, click Create an owner account.",
      "Choose a username and password.",
      "After account creation, the app logs you in automatically.",
      "Next time, enter the same username and password and click Login.",
      "After login, you can manage rooms, tenants, bills, payments, history, and AI Help.",
      "Click Logout from the top bar when you finish."
    ],
    notes: [
      "You do not need to manually add every owner in Vercel.",
      "Vercel PG_OWNER_ACCOUNTS is only an optional emergency fallback.",
      "Each owner account sees only its own rooms, tenants, bills, payments, and history.",
      "There are no manager or staff roles yet; every login is treated as the owner of that account.",
      "To remove an owner later, delete that owner account from the owner_accounts table."
    ]
  }
];

export default function ManualPage() {
  return (
    <main className="space-y-5">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">User Manual</h2>
            <p className="mt-2 text-sm text-mist">
              Complete embedded guide for every main action in the PG Electricity Bill Manager.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded-xl border border-black/10 px-3 py-2 hover:border-gold dark:border-white/15" href="/rooms">Rooms</Link>
            <Link className="rounded-xl border border-black/10 px-3 py-2 hover:border-gold dark:border-white/15" href="/tenants">Tenants</Link>
            <Link className="rounded-xl border border-black/10 px-3 py-2 hover:border-gold dark:border-white/15" href="/bills">Bills</Link>
            <Link className="rounded-xl border border-black/10 px-3 py-2 hover:border-gold dark:border-white/15" href="/history">History</Link>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        {guideSections.map((section) => (
          <Card key={section.title}>
            <h3 className="text-lg font-semibold">{section.title}</h3>
            <p className="mt-1 text-sm text-mist">{section.purpose}</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold uppercase tracking-wide text-mist">Important</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mist">
                {section.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}
