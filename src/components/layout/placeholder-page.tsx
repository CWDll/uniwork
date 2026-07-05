export function PlaceholderPage({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
      <p className="text-sm font-black uppercase tracking-wide text-blue-700">
        Planned screen
      </p>
      <h1 className="mt-3 text-2xl font-black">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}
