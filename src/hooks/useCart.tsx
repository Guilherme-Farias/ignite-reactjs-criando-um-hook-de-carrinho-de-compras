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
    const storagedCart = localStorage.getItem(
      '@RocketShoes:cart'
    );

    if (storagedCart) {
      return JSON.parse(storagedCart);
    } else {
      return [];
    }
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get<Stock>(`/stock/${productId}`)
      const { amount: amountInStock } = response.data;

      const productInCart = cart.find(product => (
        productId === product.id
      ))

      if (!!productInCart) {
        if (amountInStock > productInCart.amount) {
          const cartUpdated = cart.map((product) => productId === product.id
            ? {
              ...product,
              amount: productInCart.amount + 1
            }
            : product)
          setCart(cartUpdated)
          localStorage.setItem('@RocketShoes:cart',
            JSON.stringify(cartUpdated)
          )
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      } else {
        if (amountInStock > 1) {
          const response = await api.get<Product>(`/products/${productId}`)
          const newProduct = {
            ...response.data,
            amount: 1
          }
          setCart([...cart, newProduct])
          localStorage.setItem('@RocketShoes:cart',
            JSON.stringify([...cart, newProduct])
          )
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => productId === product.id)
      if(productIndex === -1) {
        throw new Error('Produto não existe');
      }
      const cartUpdated = cart.filter(product => (
        productId !== product.id
      ))
      setCart(cartUpdated)
      localStorage.setItem('@RocketShoes:cart',
        JSON.stringify(cartUpdated)
      )
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1){
        throw new Error('Não pode atualizar produtos que possua quantidade igual a zero');
      }
      const response = await api.get<Stock>(`/stock/${productId}`);
      const hasStock = response.data;

      if (hasStock.amount <= amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const cartUpdated = cart.map(product => (
        productId === product.id ? ({
          ...product,
          amount
        }) : product
      ))
      setCart(cartUpdated)
      localStorage.setItem('@RocketShoes:cart',
        JSON.stringify(cartUpdated)
      )
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
