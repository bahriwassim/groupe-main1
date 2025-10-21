import ProductionView from './production-view';
import { Factory } from 'lucide-react';

export default function ProductionPage() {
  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50/30">
      {/* En-tête avec gradient moderne */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-8 shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Factory className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Planification de la Production
              </h1>
              <p className="text-blue-100 mt-1 text-lg">
                Gérer et organiser la production quotidienne des commandes
              </p>
            </div>
          </div>
        </div>
      </div>

      <ProductionView />
    </div>
  );
}
