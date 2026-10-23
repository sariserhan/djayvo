import sys,unittest
from pathlib import Path
from types import SimpleNamespace
import mlx.core as mx
import mlx.nn as nn
from mlx.utils import tree_flatten
from mlx_lm.tuner.trainer import default_loss
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from train_song_planner import song_loss

class Body(nn.Module):
 def __init__(self):super().__init__();self.embed_tokens=nn.Embedding(17,8)
 def __call__(self,x):return self.embed_tokens(x)
class Toy(nn.Module):
 def __init__(self,tied):
  super().__init__();self.model=Body();self.lm_head=nn.Linear(8,17,bias=False);self.args=SimpleNamespace(tie_word_embeddings=tied);self.model_type='qwen3'
 def __call__(self,x):
  h=self.model(x);return self.model.embed_tokens.as_linear(h) if self.args.tie_word_embeddings else self.lm_head(h)
class SongLossTests(unittest.TestCase):
 def test_chunking_preserves_masked_loss_and_gradients_without_truncation(self):
  mx.random.seed(42)
  for tied in [False,True]:
   model=Toy(tied);batch=mx.random.randint(0,17,(2,280));lengths=mx.array([[24,279],[10,255]])
   (expected,tokens),gradient=nn.value_and_grad(model,default_loss)(model,batch,lengths)
   (actual,count),chunked=nn.value_and_grad(model,song_loss)(model,batch,lengths)
   self.assertTrue(mx.allclose(actual,expected,atol=1e-6).item());self.assertEqual(tokens.item(),count.item())
   for (key,a),(other,b) in zip(tree_flatten(gradient),tree_flatten(chunked)):
    self.assertEqual(key,other);self.assertTrue(mx.allclose(a,b,rtol=1e-4,atol=5e-6).item(),key)
if __name__=='__main__':unittest.main()
