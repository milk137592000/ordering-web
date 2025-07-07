
import React, { useCallback } from 'react';
import { Store } from '../types';
import Button from './common/Button';
import Card from './common/Card';
import { ShuffleIcon, ArrowLeftIcon } from './icons';

interface StoreSelectorProps {
  stores: Store[];
  onSelect: (store: Store) => void;
  title: string;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}

const StoreSelector: React.FC<StoreSelectorProps> = ({ stores, onSelect, title, onBack, onSkip, skipLabel }) => {
  const handleRandomSelect = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * stores.length);
    onSelect(stores[randomIndex]);
  }, [stores, onSelect]);

  const totalItems = (store: Store) => {
    return store.menu.reduce((sum, category) => sum + category.items.length, 0);
  };

  return (
    <div>
        {onBack && (
          <div className="mb-6">
            <Button onClick={onBack} variant="secondary">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              返回
            </Button>
          </div>
        )}
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800">{title}</h2>
            <p className="text-slate-500 mt-2">從列表中選擇一間，或讓命運來決定！</p>
        </div>

      <div className="text-center mb-8 flex items-center justify-center flex-wrap gap-4">
        <Button onClick={handleRandomSelect} size="large">
          <ShuffleIcon className="h-5 w-5 mr-2" />
          隨機選擇！
        </Button>
        {onSkip && skipLabel && (
            <Button onClick={onSkip} size="large" variant="secondary">
              {skipLabel}
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {stores.map(store => (
          <Card 
            key={store.id} 
            className="overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
            onClick={() => onSelect(store)}
            >
            <div className="h-32 bg-indigo-500 flex items-center justify-center">
                <p className="text-white font-bold text-xl px-2 text-center">{store.name}</p>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg text-slate-700">{store.name}</h3>
              <p className="text-sm text-slate-500">{totalItems(store)} 項餐點</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StoreSelector;