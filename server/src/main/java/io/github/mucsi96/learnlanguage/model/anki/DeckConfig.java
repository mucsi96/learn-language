package io.github.mucsi96.learnlanguage.model.anki;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * DeckConfig generated by hbm2java
 */
@Entity
@Table(name="deck_config"
)
public class DeckConfig  implements java.io.Serializable {


     private int id;
     private String name;
     private int mtimeSecs;
     private int usn;
     private String config;

    public DeckConfig() {
    }

    public DeckConfig(int id, String name, int mtimeSecs, int usn, String config) {
       this.id = id;
       this.name = name;
       this.mtimeSecs = mtimeSecs;
       this.usn = usn;
       this.config = config;
    }
   
     @Id 

    
    @Column(name="id", nullable=false)
    public int getId() {
        return this.id;
    }
    
    public void setId(int id) {
        this.id = id;
    }

    
    @Column(name="name", nullable=false, length=2000000000)
    public String getName() {
        return this.name;
    }
    
    public void setName(String name) {
        this.name = name;
    }

    
    @Column(name="mtime_secs", nullable=false)
    public int getMtimeSecs() {
        return this.mtimeSecs;
    }
    
    public void setMtimeSecs(int mtimeSecs) {
        this.mtimeSecs = mtimeSecs;
    }

    
    @Column(name="usn", nullable=false)
    public int getUsn() {
        return this.usn;
    }
    
    public void setUsn(int usn) {
        this.usn = usn;
    }

    
    @Column(name="config", nullable=false, length=2000000000)
    public String getConfig() {
        return this.config;
    }
    
    public void setConfig(String config) {
        this.config = config;
    }




}

