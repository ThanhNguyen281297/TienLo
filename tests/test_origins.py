import os,sys,unittest
sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server

class OriginTests(unittest.TestCase):
    def test_variants_and_lists(self):
        got=server._origin_variants('https://tienlo2d.xyz, https://old.example/')
        self.assertEqual(got,{'https://tienlo2d.xyz','https://www.tienlo2d.xyz','https://old.example','https://www.old.example'})
        self.assertEqual(server._origin_variants('https://www.a.io'),{'https://www.a.io','https://a.io'})
        self.assertEqual(server._origin_variants(''),set())

if __name__=='__main__': unittest.main()
