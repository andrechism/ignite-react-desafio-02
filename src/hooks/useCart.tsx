import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if(storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartProduct = cart.find(product => product.id === productId);
      if (cartProduct) {
        updateProductAmount({ productId, amount: cartProduct.amount + 1 });
      }
      else {
        const response = await api.get(`/products/${productId}`)
        
        const selectedProduct = response.data;

        if (!selectedProduct) {
          toast.error('Erro na adição do produto');
          return;
        }

        const newProduct = {
          ...selectedProduct,
          amount: 1
        }
        
        const newCart = [...cart, newProduct];

        setCart(newCart);

        const cartData = JSON.stringify(newCart);
        localStorage.setItem('@RocketShoes:cart', cartData)
        
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const hasProductOnCart = cart.some((product: Product) => product.id === productId);

      if (!hasProductOnCart) {
        toast.error('Erro na remoção do produto');
        return;
      }
      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      const cartData = JSON.stringify(newCart);
      localStorage.setItem('@RocketShoes:cart', cartData)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount < 1) return;

    try {
      const response = await api.get(`/stock/${productId}`);
      const data: Stock = response.data;
      
      if (!data) return;

      const stockAmount = data.amount;
      const selectedProduct = cart.find(product => product.id === productId)
      if (!selectedProduct) return;
      
      
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      } else if (amount <= 0) {
        return;
      }

      const newCart = cart.map(product => {
        if (product.id === selectedProduct.id) {
          selectedProduct.amount = amount;
          return selectedProduct;
        }
        return product;
      });

      setCart(newCart);
      const cartData = JSON.stringify(newCart);
      localStorage.setItem('@RocketShoes:cart', cartData)

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);
  
  return context;
}
