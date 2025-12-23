import { Button } from '@/components/ui/button'
import { useReducer } from 'react'

function dispatcher(state, action) {
  console.log(state, action)
  switch (action.type) {
    case 'ADD': {
      const newItem = { name: `Item ${state.length + 1}` }
      return [...state, newItem]
    }
    case 'REMOVE': {
      return state.filter((_, idx) => idx !== action.idx)
    }
    case 'CLEAR': {
      return []
    }
    default:
      return state
  }
}

function Home() {
  const [cart, dispatch] = useReducer(dispatcher, [])

  return (
    <div className=' flex flex-col gap-5 '>
      <div className='flex gap-5'>
        <Button onClick={() => dispatch({ type: 'ADD' })} className='w-fit' variant={'outline'}>
          Add Item
        </Button>
        <Button onClick={() => dispatch({ type: 'CLEAR' })} className='w-fit' variant={'outline'}>
          Clear Items
        </Button>
      </div>
      {cart &&
        cart.map((item, idx) => {
          return (
            <div key={idx} className=' flex gap-5 items-center font-semibold  '>
              <p>{item.name}</p>
              <Button
                onClick={() => dispatch({ type: 'REMOVE', idx: idx })}
                variant={'destructive'}
              >
                {' '}
                Remove
              </Button>
            </div>
          )
        })}
    </div>
  )
}

export default Home
