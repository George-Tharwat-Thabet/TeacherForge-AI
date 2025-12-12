import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LessonGenerator from './pages/LessonGenerator';
import ExamGenerator from './pages/ExamGenerator';
import AutoGrading from './pages/AutoGrading';
import Analytics from './pages/Analytics';
import Timetable from './pages/Timetable';
import ParentLetters from './pages/ParentLetters';
import LessonRemix from './pages/LessonRemix';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<LessonGenerator />} />
          <Route path="/exams" element={<ExamGenerator />} />
          <Route path="/grading" element={<AutoGrading />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/letters" element={<ParentLetters />} />
          <Route path="/remix" element={<LessonRemix />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
