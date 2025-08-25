import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/profile/:username" component={Profile} />
          <Route path="/profile/:username/followers" component={Profile} />
          <Route path="/profile/:username/following" component={Profile} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
