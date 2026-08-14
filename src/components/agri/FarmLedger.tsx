import React, { useState, useEffect } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { PlusCircle, MinusCircle, TrendingUp, TrendingDown, Wallet, Calendar } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface FarmLedgerProps {
  onToast: (message: string) => void;
}

const EMPTY_LEDGER: Transaction[] = [];

const loadLedger = (): Transaction[] => {
  try {
    const raw = localStorage.getItem("farm_ledger");
    if (!raw) return EMPTY_LEDGER;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : EMPTY_LEDGER;
  } catch {
    return EMPTY_LEDGER;
  }
};

const EXPENSE_CATEGORIES = ['Seeds', 'Fertilizer', 'Pesticides', 'Labor', 'Transport', 'Equipment', 'Irrigation', 'Other'];
const INCOME_CATEGORIES = ['Crop Sale', 'Milk Sale', 'Animal Sale', 'Rent Income', 'Government Subsidy', 'Other'];

const FarmLedger: React.FC<FarmLedgerProps> = ({ onToast }) => {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>(loadLedger);
  const [showForm, setShowForm] = useState<'income' | 'expense' | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    try {
      localStorage.setItem("farm_ledger", JSON.stringify(transactions));
    } catch {
      // storage full or unavailable — keep in memory
    }
  }, [transactions]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const chartData = [
    { name: 'Income', value: totalIncome, color: 'hsl(142, 76%, 36%)' },
    { name: 'Expenses', value: totalExpense, color: 'hsl(0, 84%, 60%)' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (!formData.category || !Number.isFinite(amount) || amount <= 0) {
      onToast('Please enter a valid amount and category');
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: showForm!,
      amount,
      category: formData.category,
      description: formData.description,
      date: formData.date
    };

    setTransactions([newTransaction, ...transactions]);
    setFormData({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
    setShowForm(null);
    onToast(`${showForm === 'income' ? 'Income' : 'Expense'} added successfully!`);
  };

  const categories = showForm === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="pb-24 pt-4 px-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="text-primary" /> Farm Khata
        </h2>
        <p className="text-muted-foreground text-sm">
          Track your farm income and expenses
        </p>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <AgriButton
          onClick={() => setShowForm('income')}
          className="bg-green-600 hover:bg-green-700 text-white h-14"
        >
          <PlusCircle size={20} /> Add Income
        </AgriButton>
        <AgriButton
          onClick={() => setShowForm('expense')}
          className="bg-red-500 hover:bg-red-600 text-white h-14"
        >
          <MinusCircle size={20} /> Add Expense
        </AgriButton>
      </div>

      {/* Add Transaction Form */}
      {showForm && (
        <AgriCard className="mb-4 border-2 border-primary/30">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            {showForm === 'income' ? (
              <PlusCircle className="text-green-600" size={18} />
            ) : (
              <MinusCircle className="text-red-500" size={18} />
            )}
            Add {showForm === 'income' ? 'Income' : 'Expense'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t('agr83')}</Label>
              <Input
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('agr84')}</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full mt-1 p-2 rounded-lg border border-input bg-background text-foreground text-base sm:text-sm"
              >
                <option value="">{t('agr85')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('agr86')}</Label>
              <Input
                type="text"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('agr87')}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <AgriButton type="submit" className="flex-1">
                Save
              </AgriButton>
              <AgriButton 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(null)}
                className="flex-1"
              >
                Cancel
              </AgriButton>
            </div>
          </form>
        </AgriCard>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <AgriCard className="p-3 text-center bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <TrendingUp className="mx-auto text-green-600 dark:text-green-400 mb-1" size={20} />
          <p className="text-xs text-muted-foreground">{t('agr88')}</p>
          <p className="font-bold text-green-600 dark:text-green-400">₹{totalIncome.toLocaleString()}</p>
        </AgriCard>
        <AgriCard className="p-3 text-center bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
          <TrendingDown className="mx-auto text-red-500 mb-1" size={20} />
          <p className="text-xs text-muted-foreground">{t('agr89')}</p>
          <p className="font-bold text-red-500">₹{totalExpense.toLocaleString()}</p>
        </AgriCard>
        <AgriCard className={`p-3 text-center ${netProfit >= 0 ? 'bg-primary/10 border-primary/30' : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200'}`}>
          <Wallet className={`mx-auto mb-1 ${netProfit >= 0 ? 'text-primary' : 'text-orange-500'}`} size={20} />
          <p className="text-xs text-muted-foreground">{t('agr90')}</p>
          <p className={`font-bold ${netProfit >= 0 ? 'text-primary' : 'text-orange-500'}`}>
            {netProfit >= 0 ? '+' : ''}₹{netProfit.toLocaleString()}
          </p>
        </AgriCard>
      </div>

      {/* Donut Chart */}
      <AgriCard className="mb-4">
        <h3 className="font-bold text-foreground mb-2">{t('agr91')}</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend 
                formatter={(value, entry: any) => (
                  <span className="text-foreground text-sm">
                    {value}: ₹{entry.payload.value.toLocaleString()}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </AgriCard>

      {/* Recent Transactions */}
      <AgriCard>
        <h3 className="font-bold text-foreground mb-3">{t('agr92')}</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {transactions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions yet — add your first income or expense above.
            </p>
          )}
          {transactions.map((t) => (
            <div 
              key={t.id} 
              className={`flex items-center justify-between p-3 rounded-lg ${
                t.type === 'income' 
                  ? 'bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900' 
                  : 'bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  t.type === 'income' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                }`}>
                  {t.type === 'income' ? (
                    <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown size={16} className="text-red-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{t.category}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar size={10} /> {new Date(t.date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <p className={`font-bold ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </AgriCard>
    </div>
  );
};

export default FarmLedger;
