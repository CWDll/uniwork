export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      {eyebrow ? (
        <p className="mb-3 text-sm font-black uppercase tracking-wide text-blue-700">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
        {description}
      </p>
    </div>
  );
}
