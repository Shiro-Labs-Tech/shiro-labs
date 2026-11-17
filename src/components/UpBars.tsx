/* Uptime bars for the status page sample: 45 thin bars, a few marked warn or red. */
export default function UpBars({ warn = [], red = [] }: { warn?: number[]; red?: number[] }) {
  return (
    <>
      {Array.from({ length: 45 }, (_, i) => (
        <rect key={i} x={i * 2} y={0} width={1.4} height={10} className={red.includes(i) ? 'r' : warn.includes(i) ? 'w' : undefined} />
      ))}
    </>
  );
}
