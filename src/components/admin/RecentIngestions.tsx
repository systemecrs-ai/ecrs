import { FileText, CheckCircle2, Clock } from 'lucide-react';

const mockIngestions = [
  {
    id: 'ing_1',
    filename: 'Spring_Collection_Manual_2026.pdf',
    status: 'completed',
    date: 'Just now',
    chunks: 142,
  },
  {
    id: 'ing_2',
    filename: 'Winter_Jackets_Specs_v2.pdf',
    status: 'completed',
    date: '2 hours ago',
    chunks: 58,
  },
  {
    id: 'ing_3',
    filename: 'Shoe_Inventory_Q3.pdf',
    status: 'processing',
    date: '3 hours ago',
    chunks: null,
  },
];

export default function RecentIngestions() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-6 backdrop-blur-xl">
      <h3 className="mb-4 text-lg font-semibold text-white">Recent Ingestions</h3>
      
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <table className="w-full text-left text-sm text-white/70">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] text-xs uppercase text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Chunks</th>
              <th className="px-4 py-3 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {mockIngestions.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                      <FileText className="h-4 w-4 text-white/60" />
                    </div>
                    <span className="font-medium text-white/90">{item.filename}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {item.status === 'completed' ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
                      <Clock className="h-3 w-3" />
                      Processing
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {item.chunks ? item.chunks : '--'}
                </td>
                <td className="px-4 py-3 text-right text-white/50">
                  {item.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
