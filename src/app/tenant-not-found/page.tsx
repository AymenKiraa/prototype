export default function TenantNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center py-32 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">No business found at this address</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Check the URL, or contact the business for their booking link.
        </p>
      </div>
    </div>
  );
}
